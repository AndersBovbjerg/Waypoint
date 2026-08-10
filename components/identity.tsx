import {
  Footprints,
  Dumbbell,
  Bike,
  HeartPulse,
  Code,
  Briefcase,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  Music,
  Camera,
  Palette,
  Home,
  Plane,
  Sprout,
  Wallet,
  PenLine,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------
   What a project looks like at a glance.

   Colour stays a slot rather than a hex value: light and dark tune the same
   slot differently, so a project keeps its identity when the mode changes.
   Storing a hex would look right in one mode and wrong in the other.

   The icon is the second half of that identity. It carries further than colour
   on a busy list, but not on the calendar's small dots — those stay colour
   only, because a five-pixel icon is a smudge.
   ------------------------------------------------------------------ */

export const ICONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "run", label: "Running", Icon: Footprints },
  { id: "strength", label: "Strength", Icon: Dumbbell },
  { id: "bike", label: "Cycling", Icon: Bike },
  { id: "health", label: "Health", Icon: HeartPulse },
  { id: "code", label: "Code", Icon: Code },
  { id: "work", label: "Work", Icon: Briefcase },
  { id: "growth", label: "Growth", Icon: TrendingUp },
  { id: "people", label: "People", Icon: Users },
  { id: "read", label: "Reading", Icon: BookOpen },
  { id: "study", label: "Study", Icon: GraduationCap },
  { id: "music", label: "Music", Icon: Music },
  { id: "photo", label: "Photography", Icon: Camera },
  { id: "make", label: "Making", Icon: Palette },
  { id: "home", label: "Home", Icon: Home },
  { id: "travel", label: "Travel", Icon: Plane },
  { id: "habit", label: "Habit", Icon: Sprout },
  { id: "money", label: "Money", Icon: Wallet },
  { id: "write", label: "Writing", Icon: PenLine },
];

export function ProjectIcon({
  icon,
  color,
  size = 15,
}: {
  icon: string | null;
  color: string;
  size?: number;
}) {
  const found = ICONS.find((i) => i.id === icon);
  /* Without an icon the project falls back to the colour dot it always had,
     so nothing looks half-configured. */
  if (!found) {
    return <span className="wp-swatch" style={{ background: color }} />;
  }
  const { Icon } = found;
  return <Icon size={size} color={color} className="wp-picon" aria-hidden="true" />;
}
