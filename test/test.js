const EPub = require("../lib");
const path = require("path");
const fs = require("fs");

async function runTestOn(input) {
	let params = JSON.parse(fs.readFileSync(path.resolve(__dirname, `./${input}.json`), { encoding: "utf8" }));

	return (new EPub(params, path.resolve(__dirname, `./${input}.epub`))).then(() => {
		console.log(`${params.title} is generated successfully`);
	}, (error) => {
		console.log(`${params.title} can't be generated`);
		console.error(error);
	});
}

async function runTests() {
	// Test with a book
	try {
		await runTestOn("book-v2");
	} catch (err) {
		console.error(err);
	}

	// Test with a book
	try {
		await runTestOn("book-v3");
	} catch (err) {
		console.error(err);
	}

	// Test with an article
	try {
		await runTestOn("article-v2");
	} catch (err) {
		console.error(err);
	}

	// Test with an article
	try {
		await runTestOn("article-v3");
	} catch (err) {
		console.error(err);
	}
}

runTests();