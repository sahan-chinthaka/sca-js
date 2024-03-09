"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";

interface AutoCompleteOptions {
	selectedKey?: React.Key;
	selectItem: (key: React.Key) => void;
	show: boolean;
}

interface AutoCompleteProps<T> {
	data: T[];
	children: (items: T[], options: AutoCompleteOptions) => ReactNode;
	input?: React.RefObject<HTMLInputElement>;
	controller?: any;
	dataValue: (value: T) => string;
	dataKey: (key: T) => React.Key;
	maximumItems?: number;
}

export function useAutoComplete(form: any): any {
	const input = useRef<HTMLInputElement>(null);
	const name = useRef<string>();

	return {
		field: function (data: any) {
			const { ref: refCopy, ...d } = data;
			refCopy(input.current);
			name.current = data.name;

			return {
				ref: input,
				...d,
			};
		},
		input,
		controller: () => ({ form, name, input }),
	};
}

export function AutoComplete<T>({ data, children, input, dataValue, dataKey, maximumItems, controller }: AutoCompleteProps<T>) {
	const [selectedKey, setSelectedKey] = useState<React.Key>();
	const select = useRef(-1);
	const result = useRef<T[]>(data);

	const [show, setShow] = useState(false);
	const [_, setSearch] = useState("");

	function onFocus() {
		showSuggestions();
	}

	function onChange(e: Event) {
		const self = e.target as HTMLInputElement;
		update(self.value);
		setShow(true);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key == "ArrowUp") {
			e.preventDefault();
			select.current--;

			if (select.current <= -1) {
				select.current = -1;
				setSelectedKey(undefined);
				return;
			}

			const key = result.current[select.current];
			setSelectedKey(dataKey(key));
		} else if (e.key == "ArrowDown") {
			e.preventDefault();
			select.current++;

			if (result.current.length <= select.current) {
				select.current = -1;
				setSelectedKey(undefined);
				return;
			}

			const key = result.current[select.current];
			setSelectedKey(dataKey(key));
		} else if (e.key == "Enter") {
			if (select.current != -1) {
				if (input?.current) {
					input.current.value = dataValue(result.current[select.current]);
					if (controller?.form) controller.form.setValue(controller.name.current, input.current.value);
					update(input.current.value);
					e.preventDefault();
				} else if (controller?.input?.current) {
					controller.input.current.value = dataValue(result.current[select.current]);
					controller.form.setValue(controller.name.current, controller.input.current.value);
					update(controller.input.current.value);
					e.preventDefault();
				}
			}
		} else if (e.key == "Escape") {
			hideSuggestions();
		}
	}

	function hideSuggestions() {
		setShow(false);
		select.current = -1;
		setSelectedKey(undefined);
	}
	function showSuggestions() {
		setShow(true);
		select.current = -1;
		setSelectedKey(undefined);
	}

	function update(text: string) {
		const filtered = data
			.filter((item) => dataValue(item).toLowerCase().indexOf(text.toLowerCase()) != -1)
			.slice(0, maximumItems);
		result.current = filtered;
		setSelectedKey(undefined);
		setSearch(text);
		select.current = -1;
	}

	function selectItem(key: React.Key) {
		const filtered = result.current.filter((i) => dataKey(i) === key);
		if (filtered.length == 1) {
			const item = filtered[0];
			if (input?.current) {
				input.current.value = dataValue(item);
				controller.form.setValue(controller.name.current, input.current.value);
				select.current = -1;
				update(input.current.value);
			} else if (controller?.input?.current) {
				controller.input.current.value = dataValue(item);
				controller.form.setValue(controller.name.current, controller.input.current.value);
				select.current = -1;
				update(controller.input.current.value);
			}
		}
	}

	function windowClick(e: MouseEvent) {
		const elm = e.target as HTMLElement;
		let inp = undefined;
		if (input?.current) inp = input.current;
		else if (controller?.input?.current) inp = controller.input.current;
		if (elm != inp) {
			hideSuggestions();
		}
	}

	useEffect(() => {
		window.addEventListener("click", windowClick);

		if (input?.current) {
			input.current.addEventListener("focus", onFocus);
			input.current.addEventListener("input", onChange);
			input.current.addEventListener("keydown", onKey);
			update(input.current.value);
		} else if (controller?.input?.current) {
			controller.input.current.addEventListener("focus", onFocus);
			controller.input.current.addEventListener("input", onChange);
			controller.input.current.addEventListener("keydown", onKey);
			update(controller.input.current.value);
		}

		return () => {
			window.removeEventListener("click", windowClick);

			if (input?.current) {
				input.current.removeEventListener("focus", onFocus);
				input.current.removeEventListener("input", onChange);
				input.current.removeEventListener("keydown", onKey);
			} else if (controller?.input?.current) {
				controller.input.current.removeEventListener("focus", onFocus);
				controller.input.current.removeEventListener("input", onChange);
				controller.input.current.removeEventListener("keydown", onKey);
			}
		};
	}, []);

	return children(result.current, { selectedKey, selectItem, show });
}
