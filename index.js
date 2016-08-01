#!/usr/bin/env node
/*
	Usage: node . [url] [regex]
 */

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const fs = Promise.promisifyAll(require('fs'));

const url = process.argv[2] || 'https://www.reddit.com/r/hardwareswap/comments/4viicr/meta_giveaway_cooler_master_hyper_212_evo_x2_moto.json';
const find = process.argv[3] || '#1';

const READ_LOCALLY = false;
const MUST_HAVE_FLAIR = true;

console.log(`URL:\t ${url}`);
console.log(`FIND:\t ${find}`);
if (MUST_HAVE_FLAIR) {
	console.log('MUST_HAVE_FLAIR');
}


function getJson(url) {
	// API is limited to ~200 entries with the defaults
	url = `${url}?limit=1000`;
	return request(url).then(res => {
		if (res.statusCode !== 200) {
			throw new Error(`uh oh, something went wrong: ${res.statusCode}`);
		}
		return JSON.parse(res.body);
	});
}

function readJson(url) {
	const filename = url.replace(/^.+\/([^/]+)$/, '$1');
	return fs.readFileAsync(`./${filename}`).then(buf => JSON.parse(buf.toString()));
}

function findComments(results) {
	const comments = [];
	results.forEach(d => {
		d.data.children.forEach(child => {
			if (child.kind === 't1') {
				comments.push(child.data);
			}
		});
	});
	return comments;
}

function filterComments(comments) {
	const entries = {};
	const regex = new RegExp(find, 'i');
	comments.forEach(comment => {
		// Strip all spaces
		const body = comment.body.replace(/\s+/g, '');
		if (regex.test(body) && (!MUST_HAVE_FLAIR || comment['author_flair_css_class'])) {
			entries[comment.author] = 1;
		}
	});
	return Object.keys(entries).sort();
}

function pickOne(users) {
	return users[Math.floor(Math.random() * users.length)];
}


Promise.resolve()
	.then(() => {
		if (READ_LOCALLY) {
			return readJson(url);
		}
		return getJson(url);
	})
	.then(findComments)
	.then(filterComments)
	.then(entries => {
		console.log(`${entries.length} valid entries`, entries);
		return entries;
	})
	.then(pickOne)
	.then(winner => {
		console.log('Winner', winner);
		process.exit(0);
	})
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
