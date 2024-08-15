import '../node_modules/jsxgraph/distrib/jsxgraph.css';
import imageURL from '../images/wmr.svg';

import { JSXGraph, Board, Point, Slider, Checkbox, Polygon } from 'jsxgraph';

import { Player } from '../../Player/lib/main';

type RotationCB = ( phi: number ) => void;
type TranslationCB = ( x: number, y: number ) => void;

// TODO:
// - allow user to set the position and rotation
// - change cursor when over C or r

export class WMRGraph {

	private board: Board;
	private center: Point;
	private rotation: Point;

	constructor( elementID: string, rotationCB: RotationCB, translationCB: TranslationCB ) {

		const bsize = 20;

		this.board = JSXGraph.initBoard( elementID, {
			boundingbox: [ - bsize, bsize, bsize, - bsize ],
			// TODO: maxboundingbox
			// TODO: showfullscreen
			axis: true,
			keepaspectratio: true,
			showCopyright: false,
			showNavigation: false,
		} );

		const size = 3;
		const half_size = size / 2;

		// Center at origin facing right
		this.center = this.board.create( 'point', [ 0, 0 ], { name: 'C' } );

		// Forward point used to adjust the rotation angle
		const circle = this.board.create( 'circle', [ this.center, half_size ], { visible: false } );
		this.rotation = this.board.create( 'glider', [ circle ], { name: 'r', showInfoBox: false } );

		// NOTE: The image must be square
		// Attach image to the center point
		// TODO: allow dragging the image
		const image = this.board.create( 'image', [ imageURL, [ () => this.center.X() - half_size, () => this.center.Y() - half_size ], [ size, size ]] );

		// Rotate the image based on the rotation point
		const rotator = this.board.create( 'transform', [ 'atan2(Y(r) - Y(C), X(r) - X(C))', this.center ], { type: 'rotate' } );
		rotator.bindTo( image );

		// @ts-ignore
		this.rotation.on( 'drag', () => rotationCB( Math.atan2( this.rotation.Y() - this.center.Y(), this.rotation.X() - this.center.X() ) ) );
		this.center.on( 'drag', () => translationCB( this.center.X(), this.center.Y() ) );

	}

	addObstacle( obstaclePoints: number[][] ) {

		this.board.create( 'polygon', obstaclePoints );

	}

	addControls(): HTMLFormElement {

		/*
		From Modern Robotics, page 546
			ϕ dot = r (ur - ul) / (2d)
			x dot = r (ur + ul) cos(𝜙) / 2
			y dot = r (ur + ul) sin(𝜙) / 2

			- r is the wheel radius (m)
			- ur is the right wheel angular velocity (rad/s)
			- ul is the left wheel angular velocity (rad/s)
			- 2d is the distance between the wheels (m)

		From Wheeled Mobile Robotics, page 21
			v = (vr + vl) / 2

			ϕ dot = ω = (vr - vl) / L
			x dot = v cos(𝜙) = (vr + vl) cos(ϕ) / 2
			y dot = v sin(𝜙) = (vr + vl) sin(ϕ) / 2

			- v is the linear velocity (m/s)
			- vr is the right wheel linear velocity (m/s)
			- vl is the left wheel linear velocity (m/s)
			- L is the distance between the wheels (m)

		Conversion
			vr = r ur
			vl = r ul
		*/

		const r = 0.1;
		const d = 0.08;
		const s = 1.5;

		const ur = 4;
		const ul = 3.9;

		const timeStep = 0.1;

		// TODO: simulate from t=0 to t=time on each call to update
		// TODO: add caching

		const update = ( time: number ) => {

			let t = 0;

			let phi = 0;
			let x = 0;
			let y = 0;

			let xdot = r * ( ur + ul ) * Math.cos( 0 ) / 2;
			let ydot = r * ( ur + ul ) * Math.sin( 0 ) / 2;
			const phidot = r * ( ur - ul ) / ( 2 * d );

			while ( t < time ) {

				t += timeStep;

				x = x + xdot * timeStep;
				y = y + ydot * timeStep;
				phi = phi + phidot * timeStep;

				xdot = r * ( ur + ul ) * Math.cos( phi ) / 2;
				ydot = r * ( ur + ul ) * Math.sin( phi ) / 2;

			}

			console.log( '🚀 ~ WMRGraph ~ update ~', y, x );

			this.center.moveTo( [ x, y ] );
			this.rotation.moveTo( [ x + s * Math.cos( phi ), y + s * Math.sin( phi ) ] );

		};

		const restart = () => {};

		const player = new Player( 10, 0.1, update, restart );
		const controls = player.initialize();

		return controls;

	}

}

export class WMRGraphObstacle {

	private board: Board;
	private center: Point;
	private forward: Point;
	private inflateSlider: Slider;
	private inflatedRegionCheck: Checkbox;
	private offsetEdgesCheck: Checkbox;
	private agentOffsetEdgeCheck: Checkbox;
	private obstacle: Polygon;
	private inflatedRegions: Polygon[] = []; // Array to store inflated regions
	private offsetEdges: Polygon | null = null; // Store offset edges

	private cornerPoints: Point[] = []; // Array to store corner points

	constructor( elementID: string, rotationCB: RotationCB, translationCB: TranslationCB ) {

		this.board = JSXGraph.initBoard( elementID, {
			boundingbox: [ - 10, 10, 10, - 10 ],
			axis: true,
			keepaspectratio: true,
			showCopyright: false,
			showNavigation: false,
		} );

		const size = 2;
		const half_size = size / 2;

		// Center at origin facing right
		this.center = this.board.create( 'point', [ 0, 0 ], { name: 'COM' } );
		this.forward = this.board.create( 'point', [ half_size, 0 ], { name: 'R' } );

		// The image should be square
		// Attach image to the center point
		const image = this.board.create( 'image', [ imageURL, [ () => this.center.X() - size / 2, () => this.center.Y() - size / 2 ], [ size, size ]] );

		// Create four corner points
		this.createCornerPoints( size );

		// Move forward point with center point
		const wmrTranslator = this.board.create( 'transform', [ () => this.center.X(), () => this.center.Y() ], { type: 'translate' } );
		wmrTranslator.bindTo( this.forward );

		// Update wmr angle based on the forward point
		const wmrForwardAngle = () => Math.atan2( this.forward.Y() - this.center.Y(), this.forward.X() - this.center.X() );
		const rotator = this.board.create( 'transform', [ wmrForwardAngle, this.center ], { type: 'rotate' } );
		rotator.bindTo( image );

		// Constrain forward point to circle around the center point
		this.board.on( 'move', () => {

			this.board.suspendUpdate();

			const angle = wmrForwardAngle();
			const x = half_size * Math.cos( angle ) + this.center.X();
			const y = half_size * Math.sin( angle ) + this.center.Y();
			this.forward.moveTo( [ x, y ] );

			this.updateCornerPoints( size, angle ); // Update corner points positions

			this.board.unsuspendUpdate();
			this.drawInflation( wmrForwardAngle() );

		} );

		this.center.on( 'drag', () => translationCB( this.center.X(), this.center.Y() ) );
		this.forward.on( 'drag', () => {

			rotationCB( wmrForwardAngle() );

		} );

		this.inflateSlider = this.board.create( 'slider', [[ - 8, 8 ], [ - 4, 8 ], [ 0, 0.75, 1.5 ]], {
			withLabel: false,
		} );

		this.inflatedRegionCheck = this.board.create( 'checkbox', [ - 8, 7, '' ], {} );
		this.offsetEdgesCheck = this.board.create( 'checkbox', [ - 6.2, 7, '' ], {} );
		this.agentOffsetEdgeCheck = this.board.create( 'checkbox', [ - 4.4, 7, '' ], {} );

		this.inflateSlider.on( 'up', () => this.drawInflation( wmrForwardAngle() ) );
		this.inflatedRegionCheck.on( 'down', () => this.drawInflation( wmrForwardAngle() ) );
		this.offsetEdgesCheck.on( 'down', () => this.drawInflation( wmrForwardAngle() ) );
		this.agentOffsetEdgeCheck.on( 'down', () => this.drawInflation( wmrForwardAngle() ) );

		const obstaclePoints = [
			{ x: 3.75, y: 1.25 },
			{ x: 7.5, y: 1.25 },
			{ x: 7.5, y: 8.75 },
			{ x: 6.25, y: 8.75 },
			{ x: 6.25, y: 2.5 },
			{ x: 3.75, y: 2.5 },
		];
		this.obstacle = this.board.create( 'polygon', obstaclePoints.map( p => [ p.x, p.y ] ), {
			id: 'originalPolygon',
		} );

	}

	createCornerPoints( size: number ) {

		const half_size = size / 2;
		this.cornerPoints = [
			this.board.create( 'point', [ this.center.X() - half_size, this.center.Y() - half_size ], { name: 'P1', visible: false } ),
			this.board.create( 'point', [ this.center.X() + half_size, this.center.Y() - half_size ], { name: 'P2', visible: false } ),
			this.board.create( 'point', [ this.center.X() + half_size, this.center.Y() + half_size ], { name: 'P3', visible: false } ),
			this.board.create( 'point', [ this.center.X() - half_size, this.center.Y() + half_size ], { name: 'P4', visible: false } ),
		];

	}

	updateCornerPoints( size: number, angle: number ) {

		const half_size = size / 2;
		const cosA = Math.cos( angle );
		const sinA = Math.sin( angle );

		const points = [
			{ x: - half_size, y: - half_size },
			{ x: half_size, y: - half_size },
			{ x: half_size, y: half_size },
			{ x: - half_size, y: half_size },
		];

		this.cornerPoints.forEach( ( point, i ) => {

			const rotatedX = points[i].x * cosA - points[i].y * sinA;
			const rotatedY = points[i].x * sinA + points[i].y * cosA;
			point.moveTo( [ this.center.X() + rotatedX, this.center.Y() + rotatedY ] );

		} );

	}

	drawInflation( angle: number ) {

		const sliderValue = this.inflateSlider.Value();
		const inflate = this.inflatedRegionCheck.Value();
		const offset = this.offsetEdgesCheck.Value();
		const agent = this.agentOffsetEdgeCheck.Value();

		const points = this.obstacle.vertices.map( vertex => ( { x: vertex.X(), y: vertex.Y() } ) );

		// Clear previously drawn inflated regions
		this.inflatedRegions.forEach( region => this.board.removeObject( region ) );
		this.inflatedRegions = [];

		// Clear previously drawn offset edges
		if ( this.offsetEdges ) {

			this.board.removeObject( this.offsetEdges );
			this.offsetEdges = null;

		}

		if ( inflate ) {

			const n = points.length;
			const inflateArr = Array( n ).fill( sliderValue );
			this.drawInflatedRegion( this.board, points, inflateArr );

		}

		if ( offset ) {

			this.drawOffsetEdges( this.board, points, sliderValue );

		}

		if ( agent ) {

			this.drawAgentRegion( this.board, points, angle );

		}

	}

	drawAgentRegion( board: Board, points: { x: number, y: number }[], angle: number ) {

		const segmentDiffs = [];
		const n = points.length;
		const agentPoints = [ { x: this.center.X(), y: this.center.Y() }, { x: this.forward.X(), y: this.forward.Y() } ];

		for ( let idx = 0; idx < n; idx ++ ) {

			const curr = points[idx];
			const next = points[( idx + 1 ) % n];
			const segmentAngle = Math.atan2( next.y - curr.y, next.x - curr.x );

			const newPoints: { x: number, y: number }[] = agentPoints.map( ( p: { x: number, y: number } ) => {

				const rotated = this.rotatePoint( p, segmentAngle + angle );
				return { x: rotated.x, y: rotated.y };

			} );

			const minY = Math.min( ...newPoints.map( p => p.y ) );
			const maxY = Math.max( ...newPoints.map( p => p.y ) );

			segmentDiffs.push( Math.abs( maxY - minY ) );

		}

		if ( this.agentOffsetEdgeCheck.Value() ) {

			this.drawInflatedRegion( board, points, segmentDiffs );

		}

	}

	rotatePoint( point: { x: number, y: number }, angle: number ) {

		const cosA = Math.cos( angle );
		const sinA = Math.sin( angle );
		return {
			x: point.x * cosA - point.y * sinA,
			y: point.x * sinA + point.y * cosA,
		};

	}

	segmentNorm( a: { x: number, y: number }, b: { x: number, y: number }, magnitude = 1 ) {

		const segment = { x: b.x - a.x, y: b.y - a.y };
		const segNorm = { x: segment.y, y: - segment.x };
		const length = Math.sqrt( segNorm.x * segNorm.x + segNorm.y * segNorm.y );
		segNorm.x = ( segNorm.x / length ) * magnitude;
		segNorm.y = ( segNorm.y / length ) * magnitude;
		return segNorm;

	}

	drawPolygon( board: Board, points: { x: number, y: number }[] ) {

		const poly = board.create( 'polygon', points.map( p => [ p.x, p.y ] ), {
			fillColor: 'none',
			borders: { strokeWidth: 2 },
			fixed: true,
			vertices: { visible: false },
		} );
		return poly;

	}

	drawInflatedRegion( board: Board, points: { x: number, y: number }[], inflate: number[] ) {

		const n = points.length;
		const rectangles = [];

		for ( let idx = 0; idx < n; idx ++ ) {

			const curr = points[idx];
			const next = points[( idx + 1 ) % n];
			const segNorm = this.segmentNorm( curr, next, inflate[idx] );

			const inflatedCurr = { x: curr.x + segNorm.x, y: curr.y + segNorm.y };
			const inflatedNext = { x: next.x + segNorm.x, y: next.y + segNorm.y };

			rectangles.push( [
				[ curr.x, curr.y ],
				[ next.x, next.y ],
				[ inflatedNext.x, inflatedNext.y ],
				[ inflatedCurr.x, inflatedCurr.y ],
			] );

		}

		rectangles.forEach( ( rect ) => {

			const polygon = board.create( 'polygon', rect, {
				fillColor: 'magenta',
				strokeWidth: 0,
				fixed: true,
				vertices: { visible: false },
				fillOpacity: 0.75,
			} );
			this.inflatedRegions.push( polygon ); // Store the inflated region for future removal

		} );

	}

	drawOffsetEdges( board: Board, points: { x: number, y: number }[], inflate: number ) {

		const n = points.length;
		const offsetPoints = [];

		for ( let idx = 0; idx < n; idx ++ ) {

			if ( idx == 0 ) {

				const curr = points[idx];
				const prev = points[( idx + n - 2 ) % n];
				const next = points[( idx + 1 ) % n];

				const nn = this.segmentNorm( curr, next );
				const pn = this.segmentNorm( prev, curr );

				const x = nn.x * pn.x;
				const y = nn.y * pn.y;
				const bLen = inflate / Math.sqrt( ( 1 + x + y ) / 2.0 );

				const bisector = { x: nn.x + pn.x, y: nn.y + pn.y };
				const bisectorLength = Math.sqrt( bisector.x * bisector.x + bisector.y * bisector.y );
				bisector.x = ( bisector.x / bisectorLength ) * bLen;
				bisector.y = ( bisector.y / bisectorLength ) * bLen;

				const pNew = { x: curr.x + bisector.x, y: curr.y + bisector.y };
				offsetPoints.push( pNew );
				continue;

			}

			if ( idx == n - 1 ) {

				const curr = points[idx];
				const prev = points[( idx + n - 1 ) % n];
				const next = points[( idx + 2 ) % n];

				const nn = this.segmentNorm( curr, next );
				const pn = this.segmentNorm( prev, curr );

				const x = nn.x * pn.x;
				const y = nn.y * pn.y;
				const bLen = inflate / Math.sqrt( ( 1 + x + y ) / 2.0 );

				const bisector = { x: nn.x + pn.x, y: nn.y + pn.y };
				const bisectorLength = Math.sqrt( bisector.x * bisector.x + bisector.y * bisector.y );
				bisector.x = ( bisector.x / bisectorLength ) * bLen;
				bisector.y = ( bisector.y / bisectorLength ) * bLen;

				const pNew = { x: curr.x + bisector.x, y: curr.y + bisector.y };
				offsetPoints.push( pNew );
				continue;

			}

			const curr = points[idx];
			const prev = points[( idx + n - 1 ) % n];
			const next = points[( idx + 1 ) % n];

			const nn = this.segmentNorm( curr, next );
			const pn = this.segmentNorm( prev, curr );

			const x = nn.x * pn.x;
			const y = nn.y * pn.y;
			const bLen = inflate / Math.sqrt( ( 1 + x + y ) / 2.0 );

			const bisector = { x: nn.x + pn.x, y: nn.y + pn.y };
			const bisectorLength = Math.sqrt( bisector.x * bisector.x + bisector.y * bisector.y );
			bisector.x = ( bisector.x / bisectorLength ) * bLen;
			bisector.y = ( bisector.y / bisectorLength ) * bLen;

			const pNew = { x: curr.x + bisector.x, y: curr.y + bisector.y };
			offsetPoints.push( pNew );

		}

		this.offsetEdges = this.drawPolygon( board, offsetPoints ); // Store the offset edges for future removal

	}

}
