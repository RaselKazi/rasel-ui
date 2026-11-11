#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const REGISTRY_URL =
  process.env.RASEL_UI_REGISTRY ??
  "https://raw.githubusercontent.com/RaselKazi/rasel-ui/main/registry/registry.json";

const args = process.argv.slice(2);

const command = args[0];

const overwrite = args.includes("--overwrite");

const componentNames = args.slice(1).filter((arg) => !arg.startsWith("--"));

const OUTPUT_DIR = path.join(process.cwd(), "components", "ui");

// Fetch remote registry
async function getRegistry() {
  const response = await fetch(REGISTRY_URL);

  if (!response.ok) {
    throw new Error(`Registry request failed: ${response.status}`);
  }

  const registry = await response.json();

  if (!Array.isArray(registry.components)) {
    throw new Error("Invalid registry format.");
  }

  return registry;
}

async function confirmOverwrite(fileName) {
  if (!stdin.isTTY || !stdout.isTTY) {
    return false;
  }

  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    const answer = await rl.question(
      `Component "${fileName}" already exists. Overwrite? (y/n): `,
    );

    return ["y", "yes"].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}
// List available components
async function listComponents() {
  const registry = await getRegistry();

  console.log("\nAvailable Rasel UI Components:\n");

  for (const component of registry.components) {
    console.log(`  ${component.name.padEnd(15)} ${component.description}`);
  }

  console.log(`\nTotal: ${registry.components.length} components\n`);
}

// Validate component paths
function getSafeDestination(relativePath) {
  if (
    typeof relativePath !== "string" ||
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\")
  ) {
    throw new Error("Invalid component file path.");
  }

  const root = path.resolve(OUTPUT_DIR);
  const destination = path.resolve(root, relativePath);

  if (destination === root || !destination.startsWith(root + path.sep)) {
    throw new Error("Unsafe component file path.");
  }

  return destination;
}

function resolveComponentDependencies(registry, requestedNames) {
  const componentMap = new Map(
    registry.components.map((component) => [component.name, component]),
  );

  const orderedComponents = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(name) {
    if (visited.has(name)) {
      return;
    }

    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    const component = componentMap.get(name);

    if (!component) {
      throw new Error(`Component "${name}" not found in registry.`);
    }

    if (
      component.dependencies !== undefined &&
      !Array.isArray(component.dependencies)
    ) {
      throw new Error(`Invalid dependencies for component "${name}".`);
    }

    visiting.add(name);

    for (const dependency of component.dependencies ?? []) {
      visit(dependency);
    }

    visiting.delete(name);
    visited.add(name);

    orderedComponents.push(component);
  }

  for (const name of requestedNames) {
    visit(name);
  }

  return orderedComponents;
}

// Download and install one component
async function installComponent(component) {
  console.log(`\nInstalling ${component.name}...`);

  if (!Array.isArray(component.files) || !component.files.length) {
    throw new Error("Component has no files.");
  }

  let installed = 0;
  let overwritten = 0;
  let skipped = 0;

  for (const file of component.files) {
    const destination = getSafeDestination(file.path);

    const sourceUrl = new URL(file.url);

    if (sourceUrl.protocol !== "https:") {
      throw new Error("Only HTTPS source URLs are allowed.");
    }

    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`Failed to download ${file.path}: ${response.status}`);
    }

    const content = await response.text();

    await mkdir(path.dirname(destination), {
      recursive: true,
    });

    try {
      // প্রথমে existing file overwrite না করে write করার চেষ্টা।
      await writeFile(destination, content, { flag: "wx" });

      console.log(`  ✓ Installed: ${file.path}`);
      installed++;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      // --overwrite থাকলে সরাসরি replace।
      const shouldOverwrite = overwrite || (await confirmOverwrite(file.path));

      if (!shouldOverwrite) {
        console.log(`  - Skipped: ${file.path}`);
        skipped++;
        continue;
      }

      await writeFile(destination, content);

      console.log(`  ✓ Overwritten: ${file.path}`);
      overwritten++;
    }
  }

  console.log(`\n${component.name} installation completed.`);
  console.log(`  Installed: ${installed}`);
  console.log(`  Overwritten: ${overwritten}`);
  console.log(`  Skipped: ${skipped}`);
}

// Install multiple components
async function addComponents() {
  if (!componentNames.length) {
    console.error("Please provide component names.");
    console.log("Example: rasel-ui add button alert");
    process.exitCode = 1;
    return;
  }

  const registry = await getRegistry();

  let componentsToInstall;

  try {
    componentsToInstall = resolveComponentDependencies(
      registry,
      componentNames,
    );
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nInstallation plan:");

  for (const component of componentsToInstall) {
    console.log(`  - ${component.name}`);
  }

  for (const component of componentsToInstall) {
    try {
      await installComponent(component);
    } catch (error) {
      console.error(`\nFailed to install ${component.name}: ${error.message}`);

      process.exitCode = 1;
      return;
    }
  }
}

// Help
function showHelp() {
  console.log(`
Rasel UI CLI

Usage:
  rasel-ui <command> [options]

Commands:
  list                         List available components
  add <name...>                Add one or more components

Options:
  --overwrite                  Replace existing files
  --help                       Show help

Examples:
  rasel-ui list
  rasel-ui add button
  rasel-ui add button alert badge
  rasel-ui add button --overwrite
  `);
}

// Main CLI
async function main() {
  try {
    switch (command) {
      case "list":
        await listComponents();
        break;

      case "add":
        await addComponents();
        break;

      case "--help":
      case "-h":
      case undefined:
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
