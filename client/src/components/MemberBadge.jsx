export default function MemberBadge({ tag }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: tag.color, color: tag.textColor }}
    >
      {tag.name}
    </span>
  );
}
