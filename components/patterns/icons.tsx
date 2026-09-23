/**
 * Icon set for the Nav/Button demo — real Font Awesome Pro Kit
 * glyphs (see .font-awesome.md — kit 95881adc33, loaded in
 * app/layout.tsx), solid/filled style throughout to match DS2's
 * spec for these slots. Previously hand-drawn stroke SVGs; migrated
 * project-wide so every caller (Nav, dashboard sections, RosterDemo)
 * renders the same filled glyphs without a call-site change.
 */

type IconProps = { className?: string };

export function SearchIcon({ className }: IconProps) {
  return fa("solid", "magnifying-glass", className);
}

export function PlusIcon({ className }: IconProps) {
  return fa("solid", "plus", className);
}

export function ClockIcon({ className }: IconProps) {
  return fa("solid", "clock", className);
}

export function ClipboardIcon({ className }: IconProps) {
  return fa("solid", "clipboard", className);
}

export function EnvelopeIcon({ className }: IconProps) {
  return fa("solid", "envelope", className);
}

export function BellIcon({ className }: IconProps) {
  return fa("solid", "bell", className);
}

export function MoreIcon({ className }: IconProps) {
  return fa("solid", "ellipsis-vertical", className);
}

export function MoreHorizontalIcon({ className }: IconProps) {
  return fa("solid", "ellipsis", className);
}

export function BriefcaseIcon({ className }: IconProps) {
  return fa("solid", "briefcase", className);
}

export function PinIcon({ className }: IconProps) {
  return fa("solid", "location-dot", className);
}

/**
 * Icons below are new for the "Single Site / Front Page" dashboard
 * (fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:694), which specs
 * Font Awesome 7 Pro Solid throughout. Sized with `font-size`, not
 * width/height — see .font-awesome.md's "Conventions".
 */
function fa(style: "solid" | "regular", name: string, className?: string) {
  return <i className={["fa-" + style, "fa-" + name, className].filter(Boolean).join(" ")} aria-hidden="true" />;
}

export function ArrowRightIcon({ className }: IconProps) {
  return fa("solid", "arrow-right", className);
}

export function CaretLeftIcon({ className }: IconProps) {
  return fa("solid", "caret-left", className);
}

export function CaretRightIcon({ className }: IconProps) {
  return fa("solid", "caret-right", className);
}

export function CaretDownIcon({ className }: IconProps) {
  return fa("solid", "caret-down", className);
}

export function BookIcon({ className }: IconProps) {
  return fa("solid", "book", className);
}

export function CalendarIcon({ className }: IconProps) {
  return fa("solid", "calendar", className);
}

export function MapIcon({ className }: IconProps) {
  return fa("solid", "map", className);
}

export function LocationDotIcon({ className }: IconProps) {
  return fa("solid", "location-dot", className);
}

export function QuoteRightIcon({ className }: IconProps) {
  return fa("solid", "quote-right", className);
}

export function NewspaperIcon({ className }: IconProps) {
  return fa("solid", "newspaper", className);
}

export function BullhornIcon({ className }: IconProps) {
  return fa("solid", "bullhorn", className);
}

export function ChartLineIcon({ className }: IconProps) {
  return fa("solid", "chart-line", className);
}

export function ArrowPointerIcon({ className }: IconProps) {
  return fa("solid", "arrow-pointer", className);
}

export function StarSolidIcon({ className }: IconProps) {
  return fa("solid", "star", className);
}

export function StarHalfIcon({ className }: IconProps) {
  return fa("solid", "star-half-stroke", className);
}

export function StarRegularIcon({ className }: IconProps) {
  return fa("regular", "star", className);
}

export function SunIcon({ className }: IconProps) {
  return fa("solid", "sun-bright", className);
}

export function MoonIcon({ className }: IconProps) {
  return fa("solid", "moon", className);
}

export function PlusCircleIcon({ className }: IconProps) {
  return fa("solid", "circle-plus", className);
}

/**
 * Icons below are new for the Manager App mobile dashboard (fileKey
 * gtME8Hrbr497WEZi1U2HeZ, node 4:1289).
 */
export function QrCodeIcon({ className }: IconProps) {
  return fa("solid", "qrcode", className);
}

export function CommentsIcon({ className }: IconProps) {
  return fa("solid", "comments", className);
}

export function MessageExclamationIcon({ className }: IconProps) {
  return fa("solid", "message-exclamation", className);
}

export function ListCheckIcon({ className }: IconProps) {
  return fa("solid", "list-check", className);
}

export function TriangleExclamationIcon({ className }: IconProps) {
  return fa("solid", "triangle-exclamation", className);
}

export function TrafficLightStopIcon({ className }: IconProps) {
  return fa("solid", "traffic-light-stop", className);
}

export function UsersIcon({ className }: IconProps) {
  return fa("solid", "users", className);
}

export function BadgeCheckIcon({ className }: IconProps) {
  return fa("solid", "badge-check", className);
}

export function BarsIcon({ className }: IconProps) {
  return fa("solid", "bars", className);
}

export function HomeIcon({ className }: IconProps) {
  return fa("solid", "home", className);
}

export function CircleCheckIcon({ className }: IconProps) {
  return fa("solid", "circle-check", className);
}

export function CircleExclamationIcon({ className }: IconProps) {
  return fa("solid", "circle-exclamation", className);
}

/**
 * Icons below are new for the "Map" feature (fileKey n/a — no Figma
 * source; built from a reference screenshot of an internal Mapbox
 * dashboard, see MapPage.tsx).
 */
export function LayerGroupIcon({ className }: IconProps) {
  return fa("solid", "layer-group", className);
}

export function ChevronDownIcon({ className }: IconProps) {
  return fa("solid", "chevron-down", className);
}

export function ChevronUpIcon({ className }: IconProps) {
  return fa("solid", "chevron-up", className);
}

export function PlaneIcon({ className }: IconProps) {
  return fa("solid", "plane", className);
}

export function ChevronLeftIcon({ className }: IconProps) {
  return fa("solid", "chevron-left", className);
}

export function ArrowLeftIcon({ className }: IconProps) {
  return fa("solid", "arrow-left", className);
}

export function ChevronRightIcon({ className }: IconProps) {
  return fa("solid", "chevron-right", className);
}

export function ExpandIcon({ className }: IconProps) {
  return fa("solid", "expand", className);
}

export function SparklesIcon({ className }: IconProps) {
  return fa("solid", "sparkles", className);
}

export function CircleXmarkIcon({ className }: IconProps) {
  return fa("solid", "circle-xmark", className);
}

export function MagnifyingGlassLocationIcon({ className }: IconProps) {
  return fa("solid", "magnifying-glass-location", className);
}

export function BroomWideIcon({ className }: IconProps) {
  return fa("solid", "broom-wide", className);
}

export function NoteStickyIcon({ className }: IconProps) {
  return fa("solid", "note-sticky", className);
}

export function ClipboardCheckIcon({ className }: IconProps) {
  return fa("solid", "clipboard-check", className);
}

export function ClipboardListIcon({ className }: IconProps) {
  return fa("solid", "clipboard-list", className);
}

export function UserHardHatIcon({ className }: IconProps) {
  return fa("solid", "user-hard-hat", className);
}

export function UserGroupIcon({ className }: IconProps) {
  return fa("solid", "user-group", className);
}

export function VectorSquareIcon({ className }: IconProps) {
  return fa("solid", "vector-square", className);
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return fa("solid", "arrow-up-right", className);
}

export function UpRightAndDownLeftFromCenterIcon({ className }: IconProps) {
  return fa("solid", "up-right-and-down-left-from-center", className);
}

export function XmarkIcon({ className }: IconProps) {
  return fa("solid", "xmark", className);
}

export function LockIcon({ className }: IconProps) {
  return fa("solid", "lock", className);
}

export function ListIcon({ className }: IconProps) {
  return fa("solid", "list", className);
}
