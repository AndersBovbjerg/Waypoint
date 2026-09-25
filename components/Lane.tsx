import { ChevronRight } from "lucide-react";
import type { Activity, ColoredProject, GoalEntry } from "./types";
import { fmtShort } from "./helpers";
import { Pace } from "./shared";
import { ProjectIcon } from "./identity";
import { routeEstimate } from "./route";

/* One course's route as a lane: the filled part is how far along it you are,
   the upright tick is where an even pace from its start to its target date
   says you should be today. When you are behind, the stretch between the
   two is hatched in the drift colour — the distance to make up, drawn as a
   distance rather than written as a percentage. */
export function LaneRow({
  project,
  timeGone,
  routeDone,
  daysToTarget,
  activities,
  goalEntries,
  today,
  onOpen,
  children,
}: {
  project: ColoredProject;
  timeGone: number | null;
  routeDone: number | null;
  daysToTarget: number | null;
  activities: Activity[];
  goalEntries: GoalEntry[];
  today: string;
  /* when given, the course's name opens it */
  onOpen?: (id: string) => void;
  /* an extra line under the sentence, for the view that needs one */
  children?: React.ReactNode;
}) {
  const behind = timeGone !== null && routeDone !== null && routeDone - timeGone <= -0.15;
  const sentence = laneSentence(project, activities, goalEntries, today, daysToTarget);

  return (
    <li className="wp-lanerow">
      {onOpen ? (
        <button className="wp-reviewrow-head is-link" onClick={() => onOpen(project.id)}>
          <ProjectIcon icon={project.icon} color={project.color} size={15} />
          <span className="wp-reviewrow-name">{project.name}</span>
          <Pace timeGone={timeGone} routeDone={routeDone} />
          <ChevronRight size={16} className="wp-muted wp-rowchev" aria-hidden="true" />
        </button>
      ) : (
        <div className="wp-reviewrow-head">
          <ProjectIcon icon={project.icon} color={project.color} size={15} />
          <span className="wp-reviewrow-name">{project.name}</span>
          <Pace timeGone={timeGone} routeDone={routeDone} />
        </div>
      )}

      {routeDone !== null && (
        <div
          className="wp-lane"
          role="img"
          aria-label={`${Math.round(routeDone * 100)}% of the route${
            timeGone !== null ? `, ${Math.round(timeGone * 100)}% of the time` : ""
          }`}
        >
          <span className="wp-lane-fill" style={{ width: `${routeDone * 100}%`, background: project.color }} />
          {behind && (
            <span
              className="wp-lane-gap"
              style={{ left: `${routeDone * 100}%`, width: `${(timeGone! - routeDone) * 100}%` }}
            />
          )}
          {timeGone !== null && <span className="wp-lane-tick" style={{ left: `${timeGone * 100}%` }} />}
        </div>
      )}

      {sentence && <p className="wp-lane-text">{sentence}</p>}
      {children}
    </li>
  );
}

/* What to do next, in one or two plain sentences: what is overdue, how far
   the next checkpoint is at your usual rate, and by when. Every number in
   it is counted, never guessed — an estimate only appears once there is
   enough history to average. */
function laneSentence(
  project: ColoredProject,
  activities: Activity[],
  goalEntries: GoalEntry[],
  today: string,
  daysToTarget: number | null
): string | null {
  const parts: string[] = [];
  const open = project.waypoints.filter((w) => !w.done);
  const overdue = open.filter((w) => w.due && w.due < today).length;
  if (overdue > 0) parts.push(`${overdue} waypoint${overdue === 1 ? "" : "s"} overdue.`);

  const next = open[0];
  const estimate = routeEstimate(project, activities, goalEntries);
  const when = next?.due
    ? next.due < today
      ? `, due ${fmtShort(next.due)}`
      : next.due === today
        ? ", due today"
        : ` by ${fmtShort(next.due)}`
    : "";

  if (estimate && estimate.toward === "waypoint" && next) {
    const n = estimate.remaining === 1 ? "1 activity" : `${estimate.remaining} activities`;
    parts.push(`About ${n} from ${next.title}${when}.`);
  } else if (next) {
    parts.push(`Next: ${next.title}${when}.`);
  } else if (estimate) {
    /* the goal's label is whatever was typed — often just the number — so
       the sentence names the goal, not the label */
    const n = estimate.remaining === 1 ? "1 more activity" : `${estimate.remaining} more activities`;
    parts.push(`About ${n} to reach the goal, at your usual rate.`);
  } else if (project.waypoints.length > 0) {
    parts.push("Every waypoint reached.");
  }

  if (daysToTarget !== null && daysToTarget < 0 && project.target) {
    parts.push(`The target date passed on ${fmtShort(project.target)}.`);
  }
  if (!parts.length && project.waypoints.length === 0 && !project.goal) {
    return "No waypoints yet. Add some to see where you stand.";
  }
  return parts.length ? parts.join(" ") : null;
}
