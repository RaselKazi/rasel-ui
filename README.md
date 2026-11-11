# Rasel UI

A reusable React UI component CLI with a remote GitHub registry.

## Requirements

- Node.js 18+
- React project

## Usage

### List available components

```bash
npx rasel-ui@latest list
```

### Add a component

```bash
npx rasel-ui@latest add button
```

### Add multiple components

```bash
npx rasel-ui@latest add button alert badge
```

### Overwrite existing components

```bash
npx rasel-ui@latest add button --overwrite
```

## Installation Location

Components are installed into:

```text
components/ui/
```

## Registry

Components are fetched from the Rasel UI GitHub registry.

## License

MIT
