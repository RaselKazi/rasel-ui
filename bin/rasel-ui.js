#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REGISTRY_URL =
  process.env.RASEL_UI_REGISTRY ??
  "https://raw.githubusercontent.com/YOUR_USERNAME/rasel-ui/main/registry/registry.json";

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

// Download and install one component
async function installComponent(component) {
  console.log(`\nInstalling ${component.name}...`);

  if (!Array.isArray(component.files) || !component.files.length) {
    throw new Error("Component has no files.");
  }

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
      await writeFile(
        destination,
        content,
        overwrite ? undefined : { flag: "wx" },
      );

      console.log(`  ✓ ${file.path}`);
    } catch (error) {
      if (error.code === "EEXIST") {
        console.log(`  ! ${file.path} already exists.`);
        console.log("    Use --overwrite to replace it.");
        continue;
      }

      throw error;
    }
  }

  console.log(`✓ ${component.name} installation finished.`);
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

  for (const name of componentNames) {
    const component = registry.components.find((item) => item.name === name);

    if (!component) {
      console.error(`\nComponent "${name}" not found.`);
      continue;
    }

    try {
      await installComponent(component);
    } catch (error) {
      console.error(`Failed to install ${name}: ${error.message}`);
      process.exitCode = 1;
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
