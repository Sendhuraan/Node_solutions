'use strict';

const R = require('ramda');

// convert the given object to style string, so we can use it as inline style
const styleObj = {
	'border-color': '#fff',
	'background-color': '#fff',
	color: undefined,
	'border-style': 'solid',
	'border-width': '0'
};

const styleStr = R.compose(
	R.join(';'),
	R.map(R.join(':')),
	R.toPairs,
	R.filter(Boolean)
);

console.log(styleStr(styleObj));
