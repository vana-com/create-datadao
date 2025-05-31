const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const { execSync } = require("child_process");

// Verify we're in the correct directory
if (!fs.existsSync(path.join(process.cwd(), 'deployment.json'))) {
  console.error(chalk.red('❌ Error: Must run this command from your DataDAO project directory'));
  console.error(chalk.yellow('📁 Current directory:'), process.cwd());
  console.error(chalk.yellow('💡 Try: cd <your-project-name> && npm run deploy:proof'));
  process.exit(1);
}

/**
 * Update dlpId in proof configuration file with flexible regex patterns
 */
function updateDlpIdInConfig(deployment) {
  console.log(chalk.blue("🔧 Updating proof configuration..."));

  const configPath = path.join(
    process.cwd(),
    "proof",
    "my_proof",
    "__main__.py"
  );
  if (!fs.existsSync(configPath)) {
    console.log(
      chalk.yellow("⚠️  Proof config file not found, but continuing...")
    );
    return;
  }

  let config = fs.readFileSync(configPath, "utf8");

  const dlpIdPatterns = [
    /"dlp_id":\s*\d+/g,
    /"dlp_id"\s*:\s*\d+/g,
    /'dlp_id':\s*\d+/g,
    /'dlp_id'\s*:\s*\d+/g,
    /dlp_id\s*=\s*\d+/g,
    /DLP_ID\s*=\s*\d+/g,
  ];

  let updated = false;
  for (const pattern of dlpIdPatterns) {
    if (pattern.test(config)) {
      config = config.replace(pattern, (match) => {
        if (match.includes('"dlp_id"')) {
          return `"dlp_id": ${deployment.dlpId}`;
        } else if (match.includes("'dlp_id'")) {
          return `'dlp_id': ${deployment.dlpId}`;
        } else if (match.includes("dlp_id")) {
          return `dlp_id = ${deployment.dlpId}`;
        } else {
          return `DLP_ID = ${deployment.dlpId}`;
        }
      });
      updated = true;
      break;
    }
  }

  if (!updated) {
    console.log(
      chalk.yellow("⚠️  Could not find dlp_id pattern in config file.")
    );
    console.log(
      chalk.yellow("    Please manually update the dlp_id value to:"),
      deployment.dlpId
    );
  } else {
    fs.writeFileSync(configPath, config);
    console.log(chalk.green("✅ Proof configuration updated with dlpId"));
  }
}

/**
 * Set up git repository for proof deployment
 */
function setupGitRepository(deployment) {
  console.log(chalk.blue("🔧 Setting up git repository..."));

  try {
    // Initialize git if not already done
    if (!fs.existsSync(".git")) {
      execSync("git init", { stdio: "pipe" });
      console.log(chalk.green("✅ Git repository initialized"));
    }

    // Set up remote origin
    try {
      // Check if origin already exists
      execSync("git remote get-url origin", { stdio: "pipe" });
      // If it exists, update it
      execSync(`git remote set-url origin ${deployment.proofRepo}`, {
        stdio: "pipe",
      });
      console.log(chalk.green("✅ Git remote origin updated"));
    } catch (e) {
      // If it doesn't exist, add it
      execSync(`git remote add origin ${deployment.proofRepo}`, {
        stdio: "pipe",
      });
      console.log(chalk.green("✅ Git remote origin added"));
    }

    // Stage and commit changes
    execSync("git add .", { stdio: "pipe" });

    try {
      execSync(`git commit -m "Update dlpId to ${deployment.dlpId}"`, {
        stdio: "pipe",
      });
      console.log(chalk.green("✅ Changes committed"));
    } catch (e) {
      // Might fail if no changes or already committed
      console.log(chalk.yellow("ℹ️  No new changes to commit"));
    }

    console.log(chalk.green("✅ Git setup completed"));
    console.log();
  } catch (error) {
    console.log(
      chalk.yellow("⚠️  Git setup failed. You'll need to set up manually:")
    );
    console.log(
      chalk.yellow(`   git remote add origin ${deployment.proofRepo}`)
    );
    console.log();
  }
}

/**
 * Handle automatic deployment flow
 */
async function handleAutomaticDeployment(deployment) {
  console.log(chalk.blue("🚀 Pushing to GitHub..."));

  try {
    execSync("git push -u origin main", { stdio: "inherit" });
    console.log();
    console.log(chalk.green("✅ Successfully pushed to GitHub!"));
    console.log();
    console.log(chalk.blue("⏳ GitHub Actions is now building your proof..."));
    console.log(chalk.yellow("This usually takes 2-3 minutes."));
    console.log();

    console.log(chalk.yellow("⚠️  IMPORTANT: Wait for the NEW build to complete!"));
    console.log(chalk.yellow("   Don't use an existing/old release - you need the fresh build."));
    console.log();

    console.log(chalk.cyan("📋 Next steps:"));
    console.log(
      "1. Visit: " + chalk.yellow(`${deployment.proofRepo}/releases`)
    );
    console.log("2. " + chalk.cyan("WAIT") + " for a new release to appear (with your latest changes)");
    console.log("3. Copy the .tar.gz URL from the " + chalk.yellow("newest") + " release");
    console.log("4. Return here and enter the URL below");

    // Wait for user to get the URL
    const { proofUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "proofUrl",
        message: "Enter the .tar.gz URL from the NEWEST GitHub Release:",
        validate: (input) => {
          if (input.trim() === "") return "Proof URL is required";
          if (!input.includes(".tar.gz"))
            return "URL must point to a .tar.gz file";
          if (
            !input.includes("github.com") &&
            !input.includes("githubusercontent.com")
          ) {
            return "URL should be from GitHub releases";
          }
          return true;
        },
      },
    ]);

    return proofUrl;
  } catch (error) {
    console.log(chalk.red("❌ Failed to push to GitHub:"), error.message);
    console.log();
    console.log(chalk.yellow("Please push manually:"));
    console.log(chalk.cyan("   git push -u origin main"));
    console.log();
    throw error;
  }
}

/**
 * Handle manual deployment flow
 */
async function handleManualDeployment(deployment) {
  console.log(chalk.blue("📝 Manual deployment instructions:"));
  console.log();
  console.log(chalk.yellow("1. Push your changes to GitHub:"));
  console.log(chalk.cyan(`   git push -u origin main`));
  console.log();
  console.log(chalk.yellow("2. Monitor the build:"));
  console.log(chalk.cyan(`   ${deployment.proofRepo}/actions`));
  console.log();
  console.log(chalk.yellow("⚠️  IMPORTANT: Wait for the NEW build to complete!"));
  console.log(chalk.yellow("   Don't use an existing/old release."));
  console.log();
  console.log(chalk.yellow("3. Get the artifact URL from the " + chalk.yellow("newest") + " release in Releases section"));
  console.log();

  const { proofUrl } = await inquirer.prompt([
    {
      type: "input",
      name: "proofUrl",
      message: "Enter the .tar.gz URL from the NEWEST release when ready:",
      validate: (input) => {
        if (input.trim() === "") return "Proof URL is required";
        if (!input.includes(".tar.gz"))
          return "URL must point to a .tar.gz file";
        return true;
      },
    },
  ]);

  return proofUrl;
}

/**
 * Update UI environment with proof URL
 */
function updateUIEnvironment(deployment) {
  const uiEnvPath = path.join(process.cwd(), "ui", ".env");
  if (!fs.existsSync(uiEnvPath)) {
    return;
  }

  let uiEnv = fs.readFileSync(uiEnvPath, "utf8");

  // Add NEXT_PUBLIC_PROOF_URL if it doesn't exist
  if (!uiEnv.includes("NEXT_PUBLIC_PROOF_URL")) {
    uiEnv += `\nNEXT_PUBLIC_PROOF_URL=${deployment.proofUrl}\n`;
  } else {
    // Replace it if it exists
    uiEnv = uiEnv.replace(
      /NEXT_PUBLIC_PROOF_URL=.*/,
      `NEXT_PUBLIC_PROOF_URL=${deployment.proofUrl}`
    );
  }

  fs.writeFileSync(uiEnvPath, uiEnv);
  console.log(chalk.green("✅ UI configuration updated with proof URL"));
}

/**
 * Validate deployment configuration
 */
function validateDeployment() {
  const deploymentPath = path.join(process.cwd(), "deployment.json");

  if (!fs.existsSync(deploymentPath)) {
    console.error(
      chalk.red(
        "Error: deployment.json not found. Run previous deployment steps first."
      )
    );
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  if (!deployment.dlpId) {
    console.error(
      chalk.red(
        'Error: dlpId not found in deployment.json. Run "npm run register:datadao" first.'
      )
    );
    process.exit(1);
  }

  if (!deployment.proofRepo) {
    console.error(
      chalk.red(
        "Error: proofRepo not found in deployment.json. Run GitHub setup first."
      )
    );
    process.exit(1);
  }

  return deployment;
}

/**
 * Extract repository name from GitHub URL
 */
function extractRepoName(proofRepo) {
  const repoMatch = proofRepo.match(/github\.com\/[^\/]+\/(.+?)(?:\.git)?$/);
  if (!repoMatch) {
    console.error(chalk.red("Error: Invalid proof repository URL format."));
    process.exit(1);
  }
  return repoMatch[1];
}

/**
 * Deploy Proof of Contribution component
 */
async function deployProof() {
  try {
    console.log(
      chalk.blue("Preparing Proof of Contribution for deployment...")
    );

    // Validate deployment configuration
    const deployment = validateDeployment();
    const repoName = extractRepoName(deployment.proofRepo);

    // Update proof configuration with dlpId
    updateDlpIdInConfig(deployment);

    // Set up git repository
    const proofDir = path.join(process.cwd(), "proof");
    process.chdir(proofDir);

    setupGitRepository(deployment);

    // Provide deployment options
    console.log(chalk.blue("📋 Proof Deployment Options:"));
    console.log();

    const { deploymentChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "deploymentChoice",
        message: "How would you like to deploy your proof?",
        choices: [
          {
            name: "🚀 Automatic: Push to GitHub and wait for build",
            value: "auto",
          },
          {
            name: "📝 Manual: I'll handle the GitHub workflow myself",
            value: "manual",
          },
          { name: "⏸️  Skip: Configure later", value: "skip" },
        ],
      },
    ]);

    let proofUrl = null;

    if (deploymentChoice === "auto") {
      try {
        proofUrl = await handleAutomaticDeployment(deployment);
      } catch (error) {
        // Go back to project root before returning
        process.chdir("..");
        return;
      }
    } else if (deploymentChoice === "manual") {
      proofUrl = await handleManualDeployment(deployment);
    } else {
      console.log(chalk.yellow("⏸️  Proof deployment skipped."));
      console.log(
        chalk.yellow(
          "You can complete this later by running: npm run deploy:proof"
        )
      );

      deployment.state = deployment.state || {};
      deployment.state.proofConfigured = true;
      deployment.state.proofPublished = false;

      // Go back to project root and save
      process.chdir("..");
      const deploymentPath = path.join(process.cwd(), "deployment.json");
      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
      return;
    }

    // Update deployment with proof URL
    if (proofUrl) {
      deployment.proofUrl = proofUrl;
      deployment.state = deployment.state || {};
      deployment.state.proofConfigured = true;
      deployment.state.proofPublished = true;
    }

    // Go back to project root
    process.chdir("..");

    // Update deployment.json
    const deploymentPath = path.join(process.cwd(), "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    // Update UI environment
    updateUIEnvironment(deployment);

    console.log();
    console.log(
      chalk.green("🎉 Proof of Contribution configured successfully!")
    );
    console.log();
    console.log(chalk.blue("🎯 Next step:"));
    console.log(
      "Run " +
        chalk.cyan("npm run deploy:refiner") +
        " to configure the Data Refiner"
    );
  } catch (error) {
    console.error(
      chalk.red("Proof deployment preparation failed:"),
      error.message
    );
    process.exit(1);
  }
}

// Run the deployment
deployProof();
