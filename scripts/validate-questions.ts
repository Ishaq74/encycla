import { loadQuestionBank } from '../shared/question-bank';
import { CATEGORY_VALUES } from '../shared/schemas';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const strictEditorial = args.includes('--strict-editorial');
  const file = args.find((arg) => !arg.startsWith('--')) ?? 'data/questions.json';

  const { success, report } = await loadQuestionBank(file);

  console.log(`Questions: ${report.total}`);
  console.log('Questions per category:');
  for (const category of CATEGORY_VALUES) {
    console.log(`  ${category}: ${report.counts[category]}`);
  }

  for (const warning of report.warnings) {
    console.log(`WARN  ${warning}`);
  }

  for (const error of report.errors) {
    console.error(`ERROR ${error}`);
  }

  if (strictEditorial && report.shortArticles > 0) {
    console.error(
      `Editorial threshold not met: ${report.shortArticles} article(s) shorter than 200 characters`,
    );
    process.exitCode = 1;
    return;
  }

  if (!success) {
    console.error(`Validation failed for ${file}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Validation passed for ${file}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
