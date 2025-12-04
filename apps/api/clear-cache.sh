#!/bin/bash
# Clear TypeScript build cache
rm -rf dist
rm -f tsconfig.tsbuildinfo
rm -f .tsbuildinfo
find . -name "*.tsbuildinfo" -delete 2>/dev/null
echo "✅ TypeScript cache cleared"

