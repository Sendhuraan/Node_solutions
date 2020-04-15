'use strict';

const R = require('ramda');

const styleObj = {
	'border-color': '#fff',
	'background-color': '#fff',
	color: undefined
};

const styleStr = R.compose(R.join(';'), R.map(R.join(':')), R.toPairs);

console.log(styleStr(styleObj));
