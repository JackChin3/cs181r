import '../css/main.css';

import { WMRGraph, WMRGraphObstacle, WMRGraphForwardControl } from '../lib/main';

const ADD_OBSTACLES = false;
const ADD_CONTROLS = true;

function updateRotation( phi: number ) {

	console.log( phi );

}

function updateTranslation( x: number, y: number ) {

	console.log( x, y );

}

const wmr = new WMRGraph( 'app', updateRotation, updateTranslation );

if ( ADD_OBSTACLES ) {

	const obstaclePoints = [
		[ 3.75, 1.25 ],
		[ 7.5, 1.25 ],
		[ 7.5, 8.75 ],
		[ 6.25, 8.75 ],
		[ 6.25, 2.5 ],
		[ 3.75, 2.5 ],
	];

	wmr.addObstacle( obstaclePoints );

}

if ( ADD_CONTROLS ) {

	const controls = wmr.addControls();

	const e = document.querySelector<HTMLDivElement>( '#app' );
	e?.parentElement?.insertBefore( controls, e.nextSibling );

}

const wmrObstacle = new WMRGraphObstacle( 'obstacles', updateRotation, updateTranslation );

const wmrFoward = new WMRGraphForwardControl( 'forwardcontrol', updateRotation, updateTranslation );
