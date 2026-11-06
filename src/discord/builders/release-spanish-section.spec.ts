import { describe, expect, it } from 'vitest';

import { extractSpanishReleaseSection } from './release-spanish-section';

describe('extractSpanishReleaseSection', () => {
  it('should extract the section text up to the next level-two heading', () => {
    const body = [
      '### Added',
      '- New budget chart',
      '',
      '## Resumen (ES)',
      '- Nuevo grafico de presupuesto',
      '- Correccion de montos',
      '',
      '## Otro',
      '- ignored',
    ].join('\n');

    expect(extractSpanishReleaseSection(body)).toBe(
      '- Nuevo grafico de presupuesto\n- Correccion de montos',
    );
  });

  it('should return null when the section is missing', () => {
    const body = '### Added\n- New budget chart';

    expect(extractSpanishReleaseSection(body)).toBeNull();
  });

  it('should return null when the section is empty or whitespace only', () => {
    const body = '### Added\n- New\n\n## Resumen (ES)\n\n## More\n- x';

    expect(extractSpanishReleaseSection(body)).toBeNull();
  });

  it('should return null when the section only contains HTML comments', () => {
    const body = '## Resumen (ES)\n<!-- Text the Discord bot publishes -->\n';

    expect(extractSpanishReleaseSection(body)).toBeNull();
  });

  it('should strip HTML comments but keep real text', () => {
    const body =
      '## Resumen (ES)\n<!-- instruction -->\n- Nueva funcion\n<!-- tail -->';

    expect(extractSpanishReleaseSection(body)).toBe('- Nueva funcion');
  });

  it('should return null for a null body', () => {
    expect(extractSpanishReleaseSection(null)).toBeNull();
  });

  it('should extract the section when it is the last one in the body', () => {
    const body =
      '### Fixed\n- A bug\n\n## Resumen (ES)\n- Se corrigio un error';

    expect(extractSpanishReleaseSection(body)).toBe('- Se corrigio un error');
  });
});
