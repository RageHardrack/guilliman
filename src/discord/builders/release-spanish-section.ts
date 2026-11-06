/**
 * Pure helper that extracts the Spanish release summary (`## Resumen (ES)`)
 * from a GitHub release body, as produced by the release workflow
 * (see odd/tasks/gitflow-sync-release.md, spec S9).
 */

const SECTION_HEADING = /^##\s+Resumen \(ES\)\s*$/i;
const NEXT_HEADING = /^##\s/;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

/**
 * Returns the trimmed text of the `## Resumen (ES)` section, or `null` when
 * the section is missing, empty, or contains only whitespace/HTML comments.
 */
export function extractSpanishReleaseSection(
  body: string | null,
): string | null {
  if (!body) {
    return null;
  }

  const lines = body.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => SECTION_HEADING.test(line));

  if (headingIndex === -1) {
    return null;
  }

  const sectionLines: string[] = [];

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (NEXT_HEADING.test(lines[index])) {
      break;
    }

    sectionLines.push(lines[index]);
  }

  const text = sectionLines.join('\n').replace(HTML_COMMENT, '').trim();

  return text === '' ? null : text;
}
