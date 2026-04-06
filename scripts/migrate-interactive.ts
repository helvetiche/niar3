#!/usr/bin/env ts-node

/**
 * Interactive migration helper
 * Guides you through the migration process step by step
 * 
 * Run with: npx ts-node scripts/migrate-interactive.ts
 */

import { execSync } from "child_process";

const logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

function runCommand(command: string): void {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    logger.error("Command failed:", error);
    process.exit(1);
  }
}

function prompt(question: string): void {
  logger.info(`\n${question}`);
  logger.info("Press Enter to continue...");
}

async function main() {
  logger.info("🚀 NIA Reminder Migration - Interactive Guide");
  logger.info("==============================================\n");

  logger.info("This guide will help you migrate data from nia-reminder to your main system.\n");
  logger.info("The process has 4 steps:");
  logger.info("  1. Compare current data");
  logger.info("  2. Preview migration (dry-run)");
  logger.info("  3. Execute migration");
  logger.info("  4. Verify results\n");

  // Step 1: Compare
  logger.info("📊 STEP 1: Compare Current Data");
  logger.info("--------------------------------");
  logger.info("Let's see what data exists in your Firestore collections.\n");
  
  prompt("Ready to compare data?");
  runCommand("npm run migrate:compare");

  // Step 2: Dry Run
  logger.info("\n\n🔍 STEP 2: Preview Migration (Dry Run)");
  logger.info("--------------------------------------");
  logger.info("This will show what would be migrated WITHOUT making any changes.\n");
  
  prompt("Ready to preview the migration?");
  runCommand("npm run migrate:dry-run");

  // Step 3: Confirm
  logger.info("\n\n⚠️  STEP 3: Execute Migration");
  logger.info("----------------------------");
  logger.info("This will copy data from nia-reminder to your main system.");
  logger.info("Existing documents will be skipped (not overwritten).\n");
  
  logger.info("Are you ready to proceed with the migration?");
  logger.info("Type 'yes' to continue, or Ctrl+C to cancel:");
  
  // In a real interactive script, you'd use readline here
  // For now, we'll just show the command
  logger.info("\nTo execute the migration, run:");
  logger.info("  npm run migrate:run\n");

  // Step 4: Verify
  logger.info("📋 STEP 4: Verify Migration");
  logger.info("---------------------------");
  logger.info("After migration completes, verify the results:\n");
  logger.info("  npm run migrate:verify\n");

  // Post-migration
  logger.info("🎉 Post-Migration Steps");
  logger.info("-----------------------");
  logger.info("After successful migration:");
  logger.info("  1. Sync caches via API or admin UI");
  logger.info("  2. Test the application");
  logger.info("  3. Verify schedules, completions, and employees\n");

  logger.info("For detailed instructions, see MIGRATION_GUIDE.md");
}

main()
  .then(() => {
    logger.info("\n✨ Migration guide complete!");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Error:", error);
    process.exit(1);
  });
