import { b, details, fragment, h2, summary, table, tbody, th, tr } from "./html"

import { percentage } from "./lcov"
import { tabulate } from "./tabulate"

export function comment(lcov, options) {
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

export function diff(lcov, before, options) {
	if (!before) {
		return { body: comment(lcov, options), coverageDiff: 0 }
	}

	const pbefore = percentage(before)
	const pafter = percentage(lcov)
	const coverageDiff = pafter - pbefore
	const plus = coverageDiff > 0 ? "+" : ""
	const arrow = coverageDiff === 0 ? "" : coverageDiff < 0 ? "▾" : "▴"
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
	)
	return { body, coverageDiff }
}
