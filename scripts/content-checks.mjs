/**
 * content-checks.mjs — integrity checks for the religious content dataset.
 *
 * Incorrect or incomplete content is the highest-stakes defect this app can
 * ship, so these checks are shared by the unit-test suite and by
 * `npm run lint:content`.
 */

import salah from '../src/data/salah.json' with { type: 'json' };
import duas from '../src/data/duas.json' with { type: 'json' };
import names99 from '../src/data/names99.json' with { type: 'json' };

const ARABIC = /[\u0600-\u06FF]/;
const BENGALI = /[\u0980-\u09FF]/;
const LATIN = /[A-Za-z]/;
const PLACEHOLDER = /\b(TODO|FIXME|lorem ipsum|placeholder|xxx)\b/i;

/**
 * Run every check.
 * @returns {{problems: string[], stats: object}}
 */
export function validateContent() {
  const problems = [];
  const add = (msg) => problems.push(msg);

  /* -------------------------------------------------------------- salah */

  if (!salah.meta?.version) add('salah: meta.version is missing');
  if (!Array.isArray(salah.meta?.sources) || salah.meta.sources.length === 0) {
    add('salah: meta.sources should list at least one reference');
  }

  for (const [sectionKey, section] of Object.entries({ wudu: salah.wudu, salah: salah.salah })) {
    if (!section) {
      add(`salah: section "${sectionKey}" is missing`);
      continue;
    }
    for (const lang of ['en', 'bn']) {
      if (!section.title?.[lang]) add(`salah.${sectionKey}: title.${lang} is missing`);
      if (!section.intro?.[lang]) add(`salah.${sectionKey}: intro.${lang} is missing`);
    }
    if (!Array.isArray(section.steps) || section.steps.length === 0) {
      add(`salah.${sectionKey}: no steps`);
      continue;
    }
    section.steps.forEach((step, i) => {
      const where = `salah.${sectionKey}.steps[${i}]`;
      if (step.n !== i + 1) add(`${where}: n should be ${i + 1}, got ${step.n}`);
      for (const lang of ['en', 'bn']) {
        if (!step.title?.[lang]) add(`${where}: title.${lang} is missing`);
      }
      if (!step.body && !step.arabic) add(`${where}: needs either body text or Arabic`);
      if (step.body) {
        for (const lang of ['en', 'bn']) {
          if (!step.body[lang]) add(`${where}: body.${lang} is missing`);
        }
      }
      if (step.arabic) {
        if (!ARABIC.test(step.arabic)) add(`${where}: arabic field contains no Arabic script`);
        if (!step.translit) add(`${where}: has Arabic but no transliteration`);
        for (const lang of ['en', 'bn']) {
          if (!step.meaning?.[lang]) add(`${where}: has Arabic but no meaning.${lang}`);
        }
      }
      if (step.repeat !== undefined && !(Number.isInteger(step.repeat) && step.repeat > 0)) {
        add(`${where}: repeat must be a positive integer`);
      }
    });
  }

  /* --------------------------------------------------------------- duas */

  const categoryIds = new Set((duas.categories ?? []).map((c) => c.id));
  if (!Array.isArray(duas.items) || duas.items.length === 0) add('duas: no items');

  const duaIds = new Set();
  (duas.items ?? []).forEach((item, i) => {
    const where = `duas.items[${i}] (${item.id ?? 'no id'})`;
    if (!item.id) add(`${where}: missing id`);
    if (item.id && duaIds.has(item.id)) add(`${where}: duplicate id "${item.id}"`);
    duaIds.add(item.id);
    if (!categoryIds.has(item.category)) add(`${where}: unknown category "${item.category}"`);
    for (const lang of ['en', 'bn']) {
      if (!item.title?.[lang]) add(`${where}: title.${lang} is missing`);
    }
    if (!item.arabic && !item.body) add(`${where}: needs Arabic text or a body`);
    if (item.arabic) {
      if (!ARABIC.test(item.arabic)) add(`${where}: arabic field contains no Arabic script`);
      if (!item.translit) add(`${where}: has Arabic but no transliteration`);
      for (const lang of ['en', 'bn']) {
        if (!item.meaning?.[lang]) add(`${where}: has Arabic but no meaning.${lang}`);
      }
    }
    if (!item.source) add(`${where}: missing hadith/Qur'an reference`);
  });

  /* ---------------------------------------------------------------- 99 */

  if (!Array.isArray(names99.names)) {
    add('names99: names is not an array');
  } else {
    if (names99.names.length !== 99) {
      add(`names99: expected 99 names, got ${names99.names.length}`);
    }
    const seen = new Set();
    names99.names.forEach((n, i) => {
      if (n.n !== i + 1) add(`names99[${i}]: expected n=${i + 1}, got ${n.n}`);
      if (seen.has(n.n)) add(`names99: duplicate number ${n.n}`);
      seen.add(n.n);
      if (!n.arabic || !ARABIC.test(n.arabic)) add(`names99[${i}] (${n.translit}): arabic missing or not Arabic`);
      if (!n.translit || !LATIN.test(n.translit)) add(`names99[${i}]: translit missing`);
      if (!n.en || !LATIN.test(n.en)) add(`names99[${i}] (${n.translit}): English meaning missing`);
      if (!n.bn || !BENGALI.test(n.bn)) add(`names99[${i}] (${n.translit}): Bengali meaning missing`);
    });
  }

  /* -------------------------------------------------- placeholder sweep */

  walk(
    { salah, duas, names99 },
    '',
    (path, value) => {
      if (typeof value !== 'string') return;
      if (value.trim() === '') add(`${path}: empty string`);
      if (PLACEHOLDER.test(value)) add(`${path}: looks like a placeholder`);
    }
  );

  const stats = {
    wuduSteps: salah.wudu?.steps?.length ?? 0,
    salahSteps: salah.salah?.steps?.length ?? 0,
    duas: duas.items?.length ?? 0,
    duaCategories: duas.categories?.length ?? 0,
    names: names99.names?.length ?? 0,
  };

  return { problems, stats };
}

/** Depth-first walk over strings in a nested structure. */
function walk(node, path, visit) {
  if (typeof node === 'string') {
    visit(path || '<root>', node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}[${i}]`, visit));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node)) {
      walk(child, path ? `${path}.${key}` : key, visit);
    }
  }
}

export default validateContent;
