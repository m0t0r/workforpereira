/**
 * Skills on a public card, on a Capability Profile and on a Need alike — the same link read
 * according to the kind of Publication (`CONTEXT.md`, Skill).
 *
 * **These are not `Badge`s.** ADR-0026 forbids attaching a badge to a Person, and the audited
 * component inventory in `packages/design-system/README.md` restates it. A Skill is what the
 * Publication says, never a signal about the human behind it, so it is rendered as plain list
 * content and the primitive stays out of reach of the rule.
 *
 * **Keyed by position, not by label.** The cards key on `publicId` because they have one; a Skill
 * arrives here as a display string and nothing promises those are distinct. Two Skills whose public
 * labels collide — or a projection that joins a Skill in twice — would give React duplicate keys
 * and cost one chip silently. The list is never reordered, filtered or animated, so the index is a
 * correct key rather than a concession.
 */
export function SkillList({ skills }: { skills: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((skill, index) => (
        <li
          key={index}
          className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs"
        >
          {skill}
        </li>
      ))}
    </ul>
  );
}
