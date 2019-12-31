require('app-module-path').addPath(__dirname);

const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');
const { shim } = require('lib/shim');
const { enexXmlToHtml } = require('lib/import-enex-html-gen.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 60 * 1000; // Can run for a while since everything is in the same test unit

process.on('unhandledRejection', (reason, p) => {
	console.warn('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const fileWithPath = (filename) =>
	`${__dirname}/enex_to_html/${filename}`;

const audioResource = {
	filename: 'audio test',
	id: '9168ee833d03c5ea7c730ac6673978c1',
	mime: 'audio/x-m4a',
	size: 82011,
	title: 'audio test',
};

/**
 * Tests the importer for a single note, checking that the result of
 * processing the given `.enex` input file matches the contents of the given
 * `.html` file.
 *
 * Note that this does not test the importing of an entire exported `.enex`
 * archive, but rather a single node of such a file. Thus, the test data files
 * (e.g. `./enex_to_html/code1.enex`) correspond to the contents of a single
 * `<note>...</note>` node in an `.enex` file already extracted from
 * `<content><![CDATA[...]]</content>`.
 */
const compareOutputToExpected = (options) => {
	const inputFile = fileWithPath(`${options.testName}.enex`);
	const outputFile = fileWithPath(`${options.testName}.html`);
	const testTitle = `should convert from Enex to Html: ${options.testName}`;

	it(testTitle, asyncTest(async () => {
		const enexInput = await shim.fsDriver().readFile(inputFile);
		const expectedOutput = await shim.fsDriver().readFile(outputFile);
		const actualOutput = await enexXmlToHtml(enexInput, options.resources);

		expect(actualOutput).toEqual(expectedOutput);
	}));
};

describe('EnexToHtml', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	compareOutputToExpected({
		testName: 'checklist-list',
		resources: [],
	});

	compareOutputToExpected({
		testName: 'svg',
		resources: [],
	});

	compareOutputToExpected({
		testName: 'en-media--image',
		resources: [{
			filename: '',
			id: '89ce7da62c6b2832929a6964237e98e9', // Mock id
			mime: 'image/jpeg',
			size: 50347,
			title: '',
		}],
	});

	compareOutputToExpected({
		testName: 'en-media--audio',
		resources: [audioResource],
	});

	compareOutputToExpected({
		testName: 'attachment',
		resources: [{
			filename: 'attachment-1',
			id: '21ca2b948f222a38802940ec7e2e5de3',
			mime: 'application/pdf', // Any non-image/non-audio mime type will do
			size: 1000,
		}],
	});

	// This one is very similar to the above tests, but differs in the fact that
	// it has to mock the date to pass (because the warning inserted into the html
	// includes the note)
	it('insert warning into html when resource not found', asyncTest(async () => {
		jasmine.clock().install();
		jasmine.clock().mockDate(new Date(2013, 9, 23));

		const options = {
			testName: 'missing-resource',
			resources: [],
		};
		const inputFile = fileWithPath(`${options.testName}.enex`);
		const outputFile = fileWithPath(`${options.testName}.html`);

		const enexInput = await shim.fsDriver().readFile(inputFile);
		const expectedOutput = await shim.fsDriver().readFile(outputFile);
		const actualOutput = await enexXmlToHtml(enexInput, options.resources);

		expect(actualOutput).toEqual(expectedOutput);

		jasmine.clock().uninstall();
	}));

});
