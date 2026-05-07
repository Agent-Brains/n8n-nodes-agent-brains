#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkgDir = process.cwd();
const distDir = path.join(pkgDir, 'dist');

if (!fs.existsSync(distDir)) {
	console.error(`copy-assets: ${distDir} does not exist — did tsc run?`);
	process.exit(1);
}

const iconSrc = path.join(pkgDir, 'icons');
if (fs.existsSync(iconSrc)) {
	const iconDest = path.join(distDir, 'icons');
	fs.mkdirSync(iconDest, { recursive: true });
	for (const f of fs.readdirSync(iconSrc)) {
		fs.copyFileSync(path.join(iconSrc, f), path.join(iconDest, f));
	}
}

function copyNodeJson(src, dest) {
	if (!fs.existsSync(src)) return;
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			fs.mkdirSync(destPath, { recursive: true });
			copyNodeJson(srcPath, destPath);
		} else if (entry.name.endsWith('.node.json')) {
			fs.mkdirSync(path.dirname(destPath), { recursive: true });
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

copyNodeJson(path.join(pkgDir, 'nodes'), path.join(distDir, 'nodes'));

console.log(`copy-assets: dist populated for ${path.basename(pkgDir)}`);
