function unxcape(str: string): string {
	return str.replace(/%../g, function (substring) {
		return String.fromCharCode(parseInt(substring.substr(1), 16));
	});
}

function xcape(str) {
	return str.replace(/[^0-9a-zA-Z]/g, function (substring) {
		return "%" + parseInt(substring.charCodeAt(0)).toString(16);
	});
}

function str_divider(str: string) {
	var quote_s = false, quote_d = false, brace_r = 0, final = "";

	for (var i = 0; i < str.length; i++) {
		var c = str[i];

		if (c === "'" && !quote_d) {
			quote_s = !quote_s;
			final += "'";
		} else if (c === '"' && !quote_s) {
			quote_d = !quote_d;
			final += '"';
		} else if (!((quote_s && !quote_d) || (!quote_s && quote_d))) {
			if (c == "(") {
				brace_r++;
				final += brace_r == 1 ? "{" : "(";
			} else if (c == ")") final += --brace_r == 0 ? "}" : "%29"; else final += brace_r > 0 ? xcape(c) : c;
		} else if (c == "#") {
			i++;
			if (str[i] == "H") final += "%23"; else if (str[i] == 'D') final += "%22"; else if (str[i] == "S") final += "%27"; else {
				final += "%23";
				i--;
			}
		} else final += xcape(c);
	}
	final = final.replace(/\s+/g, " ");
	final = final.substr(final[0] == " " ? 1 : 0, final[final.length - 1] == " " ? final.length - 1 : void 0)
		.replace(/\s*([+>,~])\s*/g, (a, b) => b);
	var nexts: string[] = final.split(",");
	var orders: string[][] = [];

	for (var next of nexts) {
		next += ";";
		var order: string[] = [], from = 0, match: RegExpExecArray;

		var re = /[+,~>\[: .#;]/g;
		while ((match = re.exec(next)) != null) {
			var str1 = next.substring(from, match.index);
			order.push(unxcape(str1 == "" ? "*" : str1));
			if (next[match.index] != ";") order.push(next[match.index]);
			from = match.index + 1;
		}
		orders.push(order);
	}
	return orders;
}

function Zelect(selector: string, context = document, already_selected_nodes: HTMLElement[] = []) {
	var elems: HTMLElement[] = [];
	for (var str of str_divider(selector)) {
		var nodes: HTMLElement[] = already_selected_nodes;
		for (var i = 0; i < str.length; i += 2) {
			var c = str[i - 1], txt = str[i];
			if (i == 0) nodes = elements(txt, context);
			if (c == " ") nodes = children(nodes, txt);
			if (c == "+") nodes = nextSibling(nodes, txt);
			if (c == ">") nodes = find(nodes, txt);
			if (c == ".") nodes = classFilter(nodes, txt);
			if (c == "#") nodes = idFilter(nodes, txt);
			if (c == ":") nodes = funcFilter(nodes, txt, context);
			if (c == "[") nodes = attrFilter(nodes, txt.substr(0, txt.length - 1));
		}
		for (var node of nodes) if (indexOf(elems, node) == -1) elems.push(node);
	}
	return elems;
}

function indexOf(array: any[], val: any, from: number = 0): number {
	for (; from < array.length; from++) if (array[from] == val) return from;
	return -1;
}

function children(parent: HTMLElement[], selector: any): HTMLElement[] {
	var elems: HTMLElement[] = [];
	if (typeof selector == "string") for (var e of parent) elems = elems.concat(elements(selector, e));
	else main:for (var node of selector) for (var p of parent) if (isDescendant(p, node)) {
		elems.push(node);
		continue main;
	}
	return elems;
}

function nextSibling(before: HTMLElement[], selector: any, context = document): HTMLElement[] {
	var elemes: HTMLElement[] = [];
	var nodes: HTMLElement[] = typeof selector == "string" ? elements(selector, context) : selector;
	main: for (var node of nodes) for (var p of before) if (p.nextElementSibling == node) {
		elemes.push(node);
		continue main;
	}
	return elemes;
}

function find(parent: HTMLElement[], selector: any, context = document): HTMLElement[] {
	var elems: HTMLElement[] = [];
	var nodes: HTMLElement[] = typeof selector == "string" ? elements(selector, context) : selector;
	main:for (var node of nodes) for (var e of parent) if (node.parentElement == e) {
		elems.push(node);
		continue main;
	}
	return elems;
}

function classFilter(parent: HTMLElement[], filter: string): HTMLElement[] {
	var elems: HTMLElement[] = [];
	for (var node of parent) if (node.classList.contains(filter)) elems.push(node);
	return elems;
}

function idFilter(parent: HTMLElement[], filter: string): HTMLElement[] {
	for (var node of parent) if (node.id == filter) return [node];
	return [];
}

interface Test {
	[index: string]: (this: HTMLElement, data: string, index?: number, selected?: HTMLElement[], context?: any) => boolean;
}

// noinspection JSUnusedGlobalSymbols
var filtering_functions: Test = {
	eq: (data, index, selected) => (parseInt(data) >= 0 ? parseInt(data) : selected.length + parseInt(data)) == index,
	even: (data, index) => index % 2 == 0,
	odd: (data, index) => index % 2 == 1,
	not: function (data, index, selected, context) {
		for (var node of Zelect(data, context)) if (node == this) return false;
		return true;
	},
	not_r: function (data, index, selected) {
		for (var node of Zelect(data, undefined, selected)) if (node == this) return false;
		return true;
	},
	nth_child: function (data) {
		return this.parentElement.children[parseInt(data) - 1] == this;
	},
	// @ts-ignore
	first: (data, index, selected) => filtering_functions["eq"](0, index, selected),
	// @ts-ignore
	last: (data, index, selected) => filtering_functions["eq"](-1, index, selected),
	contains: function (data) {
		return new RegExp(data.substr(1, data.length - 2)).test(this.textContent);
	}
};

function funcFilter(parent: HTMLElement[], filter: string, context = document): HTMLElement[] {
	var elems: HTMLElement[] = [];
	var arg = null;
	var name = filter.replace(/{(.*)}/, function (a, b) {
		arg = b;
		return "";
	}).replace(/-/g, "_");
	for (var i = 0; i < parent.length; i++) {
		var node = parent[i];
		if (filtering_functions[name].call(node, arg, i, parent, context)) elems.push(node);
	}
	return elems;
}

function attrFilter(parent: HTMLElement[], selector: string): HTMLElement[] {
	var elems: HTMLElement[] = [];
	var arg = null, pref = null, name = selector.replace(/'(.*)'/, function (a, b) {
		arg = b;
		return "";
	}).replace(/\W+$/, function (a) {
		pref = a;
		return "";
	});
	for (var node of parent) {
		if (arg == null) {
			if (node.hasAttribute(name)) elems.push(node);
		} else if (pref == "=") {
			if (node.getAttribute(name) == arg) elems.push(node);
		} else if (pref == "!=") {
			if (node.getAttribute(name) != arg) elems.push(node);
		} else if (pref == "*=") {
			if (new RegExp(arg).test(node.getAttribute(name))) elems.push(node);
		} else if (pref == "^=") {
			if (new RegExp(`^${arg}`).test(node.getAttribute(name))) elems.push(node);
		} else if (pref == "$=") {
			if (new RegExp(`${arg}$`).test(node.getAttribute(name))) elems.push(node);
		}
	}
	return elems;
}

function elements(selector: string, context): HTMLElement[] {
	if (selector[0] == "{") return Zelect(selector.substr(1, selector.length - 2), context);
	var e = context.getElementsByTagName(selector);
	var coll: HTMLElement[] = [];
	for (var i = 0; i < e.length; i++) coll.push(e[i]);
	return coll;
}

function isDescendant(parent, child): boolean {
	for (child = child.parentNode; null != child;) {
		if (child == parent) return !0;
		child = child.parentNode;
	}
	return !1;
}
