'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var github = require('@actions/github');
var core = require('@actions/core');
var core__default = _interopDefault(core);
var fs = require('fs');
var fs__default = _interopDefault(fs);
var path = _interopDefault(require('path'));

function tag(name) {
	return function(...children) {
		const props =
			typeof children[0] === "object"
				? Object.keys(children[0])
						.map(key => ` ${key}='${children[0][key]}'`)
						.join("")
				: "";

		const c = typeof children[0] === "string" ? children : children.slice(1);

		return `<${name}${props}>${c.join("")}</${name}>`
	}
}

const details = tag("details");
const summary = tag("summary");
const tr = tag("tr");
const td = tag("td");
const th = tag("th");
const b = tag("b");
const table = tag("table");
const tbody = tag("tbody");
const a = tag("a");
const h2 = tag("h2");

const fragment = function(...children) {
	return children.join("")
};

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/



/* istanbul ignore next */
var exists = fs__default.exists || path.exists;

var walkFile = function(str, cb) {
    var data = [], item;

    [ 'end_of_record' ].concat(str.split('\n')).forEach(function(line) {
        line = line.trim();
        var allparts = line.split(':'),
            parts = [allparts.shift(), allparts.join(':')],
            lines, fn;

        switch (parts[0].toUpperCase()) {
            case 'TN':
                item.title = parts[1].trim();
                break;
            case 'SF':
                item.file = parts.slice(1).join(':').trim();
                break;
            case 'FNF':
                item.functions.found = Number(parts[1].trim());
                break;
            case 'FNH':
                item.functions.hit = Number(parts[1].trim());
                break;
            case 'LF':
                item.lines.found = Number(parts[1].trim());
                break;
            case 'LH':
                item.lines.hit = Number(parts[1].trim());
                break;
            case 'DA':
                lines = parts[1].split(',');
                item.lines.details.push({
                    line: Number(lines[0]),
                    hit: Number(lines[1])
                });
                break;
            case 'FN':
                fn = parts[1].split(',');
                item.functions.details.push({
                    name: fn[1],
                    line: Number(fn[0])
                });
                break;
            case 'FNDA':
                fn = parts[1].split(',');
                item.functions.details.some(function(i, k) {
                    if (i.name === fn[1] && i.hit === undefined) {
                        item.functions.details[k].hit = Number(fn[0]);
                        return true;
                    }
                });
                break;
            case 'BRDA':
                fn = parts[1].split(',');
                item.branches.details.push({
                    line: Number(fn[0]),
                    block: Number(fn[1]),
                    branch: Number(fn[2]),
                    taken: ((fn[3] === '-') ? 0 : Number(fn[3]))
                });
                break;
            case 'BRF':
                item.branches.found = Number(parts[1]);
                break;
            case 'BRH':
                item.branches.hit = Number(parts[1]);
                break;
        }

        if (line.indexOf('end_of_record') > -1) {
            data.push(item);
            item = {
              lines: {
                  found: 0,
                  hit: 0,
                  details: []
              },
              functions: {
                  hit: 0,
                  found: 0,
                  details: []
              },
              branches: {
                hit: 0,
                found: 0,
                details: []
              }
            };
        }
    });

    data.shift();

    if (data.length) {
        cb(null, data);
    } else {
        cb('Failed to parse string');
    }
};

var parse = function(file, cb) {
    exists(file, function(x) {
        if (!x) {
            return walkFile(file, cb);
        }
        fs__default.readFile(file, 'utf8', function(err, str) {
            walkFile(str, cb);
        });
    });

};


var lib = parse;
var source = walkFile;
lib.source = source;

// Parse lcov string into lcov data
function parse$1(data) {
	return new Promise(function(resolve, reject) {
		lib(data, function(err, res) {
			if (err) {
				reject(err);
				return
			}
			resolve(res);
		});
	})
}

// Get the total coverage percentage from the lcov data.
function percentage(lcov) {
	let hit = 0;
	let found = 0;
	for (const entry of lcov) {
		hit += entry.lines.hit;
		found += entry.lines.found;
	}

	return (hit / found) * 100
}

function normalisePath(file) {
	return file.replace(/\\/g, "/")
}

function createHref(options, file) {
	const relative = file.file.replace(options.prefix, "");
	const parts = relative.split("/");
	const filename = parts[parts.length - 1];
	const url = path.join(options.repository, 'blob', options.commit, options.workingDir || './', relative);
	return {
		href: `https://github.com/${url}`,
		filename
	};
}

// Tabulate the lcov data in a HTML table.
function tabulate(lcov, options) {
	const head = tr(
		th("File"),
		th("Stmts"),
		th("Branches"),
		th("Funcs"),
		th("Lines"),
		th("Uncovered Lines"),
	);

	const folders = {};
	for (const file of filterAndNormaliseLcov(lcov, options)) {
		const parts = file.file.replace(options.prefix, "").split("/");
		const folder = parts.slice(0, -1).join("/");
		folders[folder] = folders[folder] || [];
		folders[folder].push(file);
	}

	const rows = Object.keys(folders)
		.sort()
		.reduce(
			(acc, key) => [
				...acc,
				toFolder(key),
				...folders[key].map(file => toRow(file, key !== "", options)),
			],
			[],
		);

	return table(tbody(head, ...rows))
}

function filterAndNormaliseLcov(lcov, options) {
	return lcov
		.map(file => ({
			...file,
			file: normalisePath(file.file),
		}))
		.filter(file => shouldBeIncluded(file.file, options))
}

function shouldBeIncluded(fileName, options) {
	if (!options.shouldFilterChangedFiles) {
		return true
	}
	return options.changedFiles.includes(fileName.replace(options.prefix, ""))
}

function toFolder(path) {
	if (path === "") {
		return ""
	}

	return tr(td({ colspan: 6 }, b(path)))
}

function getStatement(file) {
	const { branches, functions, lines } = file;

	return [branches, functions, lines].reduce(
		function (acc, curr) {
			if (!curr) {
				return acc
			}

			return {
				hit: acc.hit + curr.hit,
				found: acc.found + curr.found,
			}
		},
		{ hit: 0, found: 0 },
	)
}

function toRow(file, indent, options) {
	return tr(
		td(filename(file, indent, options)),
		td(percentage$1(getStatement(file))),
		td(percentage$1(file.branches)),
		td(percentage$1(file.functions)),
		td(percentage$1(file.lines)),
		td(uncovered(file, options)),
	)
}

function filename(file, indent, options) {
	const {href, filename} = createHref(options, file);
	const space = indent ? "&nbsp; &nbsp;" : "";
	return fragment(space, a({ href }, filename))
}

function percentage$1(item) {
	if (!item) {
		return "N/A"
	}

	const value = item.found === 0 ? 100 : (item.hit / item.found) * 100;
	const rounded = value.toFixed(2).replace(/\.0*$/, "");

	const tag = value === 100 ? fragment : b;

	return tag(`${rounded}%`)
}

function uncovered(file, options) {
	const branches = (file.branches ? file.branches.details : [])
		.filter(branch => branch.taken === 0)
		.map(branch => branch.line);

	const lines = (file.lines ? file.lines.details : [])
		.filter(line => line.hit === 0)
		.map(line => line.line);

	const all = ranges([...branches, ...lines]);

	return all
		.map(function (range) {
			const fragment =
				range.start === range.end
					? `L${range.start}`
					: `L${range.start}-L${range.end}`;
			const { href } = createHref(options, file);
			const text =
				range.start === range.end
					? range.start
					: `${range.start}&ndash;${range.end}`;

			return a({ href: `${href}#${fragment}` }, text)
		})
		.join(", ")
}

function ranges(linenos) {
	const res = [];

	let last = null;

	linenos.sort().forEach(function (lineno) {
		if (last === null) {
			last = { start: lineno, end: lineno };
			return
		}

		if (last.end + 1 === lineno) {
			last.end = lineno;
			return
		}

		res.push(last);
		last = { start: lineno, end: lineno };
	});

	if (last) {
		res.push(last);
	}

	return res
}

function comment(lcov, options) {
	return fragment(
		options.title ? h2(options.title) : "",
		options.base
			? `Coverage after merging ${b(options.head)} into ${b(
					options.base,
			  )} will be`
			: `Coverage for this commit`,
		table(tbody(tr(th(percentage(lcov).toFixed(2), "%")))),
		"\n\n",
		details(
			summary(
				options.shouldFilterChangedFiles
					? "Coverage Report for Changed Files"
					: "Coverage Report",
			),
			tabulate(lcov, options),
		),
	)
}

function diff(lcov, before, options) {
	if (!before) {
		return { body: comment(lcov, options), coverageDiff: 0 }
	}

	const pbefore = percentage(before);
	const pafter = percentage(lcov);
	const coverageDiff = pafter - pbefore;
	const plus = coverageDiff > 0 ? "+" : "";
	const arrow = coverageDiff === 0 ? "" : coverageDiff < 0 ? "▾" : "▴";
	const body = fragment(
		options.title ? h2(options.title) : "",
		options.base
			? `Coverage after merging ${b(options.head)} into ${b(
					options.base,
			  )} will be`
			: `Coverage for this commit`,
		table(
			tbody(
				tr(
					th(pafter.toFixed(2), "%"),
					th(arrow, " ", plus, coverageDiff.toFixed(2), "%"),
				),
			),
		),
		"\n\n",
		details(
			summary(
				options.shouldFilterChangedFiles
					? "Coverage Report for Changed Files"
					: "Coverage Report",
			),
			tabulate(lcov, options),
		),
	);
	return { body, coverageDiff }
}

const REQUESTED_COMMENTS_PER_PAGE = 20;

async function deleteOldComments(github, options, context) {
	const existingComments = await getExistingComments(github, options, context);
	for (const comment of existingComments) {
		core.debug(`Deleting comment: ${comment.id}`);
		try {
			await github.issues.deleteComment({
				owner: context.repo.owner,
				repo: context.repo.repo,
				comment_id: comment.id,
			});
		} catch (error) {
			console.error(error);
		}
	}
}

async function getExistingComments(github, options, context) {
	let page = 0;
	let results = [];
	let response;
	do {
		response = await github.issues.listComments({
			issue_number: context.issue.number,
			owner: context.repo.owner,
			repo: context.repo.repo,
			per_page: REQUESTED_COMMENTS_PER_PAGE,
			page: page,
		});
		results = results.concat(response.data);
		page++;
	} while (response.data.length === REQUESTED_COMMENTS_PER_PAGE)

	return results.filter(
		comment =>
			!!comment.user &&
			(!options.title || comment.body.includes(options.title)) &&
			comment.body.includes("Coverage Report"),
	)
}

// Get list of changed files
async function getChangedFiles(githubClient, options, context) {
	if (!options.commit || !options.baseCommit) {
		core.setFailed(
			`The base and head commits are missing from the payload for this ${context.eventName} event.`,
		);
	}

	// Use GitHub's compare two commits API.
	// https://developer.github.com/v3/repos/commits/#compare-two-commits
	const response = await githubClient.repos.compareCommits({
		base: options.baseCommit,
		head: options.commit,
		owner: context.repo.owner,
		repo: context.repo.repo,
	});

	if (response.status !== 200) {
		core.setFailed(
			`The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200.`,
		);
	}

	return response.data.files
		.filter(file => file.status == "modified" || file.status == "added")
		.map(file => file.filename)
}

const MAX_COMMENT_CHARS = 65536;

async function main() {
	const token = core__default.getInput("github-token");
	const githubClient = new github.GitHub(token);
	const workingDir = core__default.getInput("working-directory") || "./";
	const lcovFile = path.join(
		workingDir,
		core__default.getInput("lcov-file") || "./coverage/lcov.info",
	);
	const baseFile = core__default.getInput("lcov-base");
	const shouldFilterChangedFiles =
		core__default.getInput("filter-changed-files").toLowerCase() === "true";
	const shouldDeleteOldComments =
		core__default.getInput("delete-old-comments").toLowerCase() === "true";
	const title = core__default.getInput("title");

	const shouldFailOnCoverageDecrease =
		core__default.getInput("fail-on-coverage-decrease").toLowerCase() === "true";

	const raw = await fs.promises.readFile(lcovFile, "utf-8").catch(err => null);
	if (!raw) {
		console.log(`No coverage report found at '${lcovFile}', exiting...`);
		return
	}

	const baseRaw =
		baseFile && (await fs.promises.readFile(baseFile, "utf-8").catch(err => null));
	if (baseFile && !baseRaw) {
		console.log(`No coverage report found at '${baseFile}', ignoring...`);
	}

	const options = {
		repository: github.context.payload.repository.full_name,
		prefix: normalisePath(`${process.env.GITHUB_WORKSPACE}/`),
		workingDir,
	};

	if (
		github.context.eventName === "pull_request" ||
		github.context.eventName === "pull_request_target"
	) {
		options.commit = github.context.payload.pull_request.head.sha;
		options.baseCommit = github.context.payload.pull_request.base.sha;
		options.head = github.context.payload.pull_request.head.ref;
		options.base = github.context.payload.pull_request.base.ref;
	} else if (github.context.eventName === "push") {
		options.commit = github.context.payload.after;
		options.baseCommit = github.context.payload.before;
		options.head = github.context.ref;
	}

	options.shouldFilterChangedFiles = shouldFilterChangedFiles;
	options.title = title;

	if (shouldFilterChangedFiles) {
		options.changedFiles = await getChangedFiles(githubClient, options, github.context);
	}

	const lcov = await parse$1(raw);

	const baselcov = baseRaw && (await parse$1(baseRaw));

	const { body, coverageDiff } = diff(lcov, baselcov, options);

	const comment = body.substring(0, MAX_COMMENT_CHARS);

	if (shouldDeleteOldComments) {
		await deleteOldComments(githubClient, options, github.context);
	}

	if (
		github.context.eventName === "pull_request" ||
		github.context.eventName === "pull_request_target"
	) {
		await githubClient.issues.createComment({
			repo: github.context.repo.repo,
			owner: github.context.repo.owner,
			issue_number: github.context.payload.pull_request.number,
			body: comment,
		});
	} else if (github.context.eventName === "push") {
		await githubClient.repos.createCommitComment({
			repo: github.context.repo.repo,
			owner: github.context.repo.owner,
			commit_sha: options.commit,
			body: comment,
		});
	}
	if (shouldFailOnCoverageDecrease && coverageDiff < 0) {
		core__default.setFailed(`Coverage decreased by ${-coverageDiff.toFixed(2)}%`);
	}
}

main().catch(function(err) {
	console.log(err);
	core__default.setFailed(err.message);
});
