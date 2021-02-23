import {InputParams, PointDimensionParams} from '../../../api/types';
import {isEmpty} from '../../../misc/type-util';
import {CompositeConstraint} from '../../common/constraint/composite';
import {Constraint} from '../../common/constraint/constraint';
import {RangeConstraint} from '../../common/constraint/range';
import {StepConstraint} from '../../common/constraint/step';
import {
	NumberFormatter,
	StringNumberParser,
} from '../../common/converter/number';
import {Value} from '../../common/model/value';
import {PaneError} from '../../common/pane-error';
import {InputBindingPlugin} from '../../input-binding';
import {getBaseStep, getSuitableDecimalDigits} from '../../util';
import {Point3dConstraint} from './constraint/point-3d';
import {Point3dTextController} from './controller/point-3d-text';
import {Point3d, Point3dObject} from './model/point-3d';
import {point3dFromUnknown} from './reader/point-3d';
import {writePoint3d} from './writer/point-3d';

function createDimensionConstraint(
	params: PointDimensionParams | undefined,
): Constraint<number> | undefined {
	if (!params) {
		return undefined;
	}

	const constraints: Constraint<number>[] = [];

	if (!isEmpty(params.step)) {
		constraints.push(
			new StepConstraint({
				step: params.step,
			}),
		);
	}
	if (!isEmpty(params.max) || !isEmpty(params.min)) {
		constraints.push(
			new RangeConstraint({
				max: params.max,
				min: params.min,
			}),
		);
	}
	return new CompositeConstraint({
		constraints: constraints,
	});
}

function createConstraint(params: InputParams): Constraint<Point3d> {
	return new Point3dConstraint({
		x: createDimensionConstraint('x' in params ? params.x : undefined),
		y: createDimensionConstraint('y' in params ? params.y : undefined),
		z: createDimensionConstraint('z' in params ? params.z : undefined),
	});
}

/**
 * @hidden
 */
export function getAxis(
	initialValue: number,
	constraint: Constraint<number> | undefined,
) {
	return {
		baseStep: getBaseStep(constraint),
		formatter: new NumberFormatter(
			getSuitableDecimalDigits(constraint, initialValue),
		),
	};
}

function createController(document: Document, value: Value<Point3d>) {
	const c = value.constraint;
	if (!(c instanceof Point3dConstraint)) {
		throw PaneError.shouldNeverHappen();
	}

	return new Point3dTextController(document, {
		axes: [
			getAxis(value.rawValue.x, c.x),
			getAxis(value.rawValue.y, c.y),
			getAxis(value.rawValue.z, c.z),
		],
		parser: StringNumberParser,
		value: value,
	});
}

/**
 * @hidden
 */
export const Point3dInputPlugin: InputBindingPlugin<Point3d, Point3dObject> = {
	id: 'input-point3d',
	binding: {
		accept: (value, _params) => (Point3d.isObject(value) ? value : null),
		reader: (_args) => point3dFromUnknown,
		writer: (_args) => writePoint3d,
		constraint: (args) => createConstraint(args.params),
		equals: Point3d.equals,
	},
	controller: (args) => {
		return createController(args.document, args.binding.value);
	},
};
