import React, { FC } from "react";

interface CounterProps {
	value: number;
}

const AnimatedCounter: FC<CounterProps> = ({ value }) => {
	return (
		<div>
			<h1>{value}</h1>
		</div>
	);
};

export default AnimatedCounter;
