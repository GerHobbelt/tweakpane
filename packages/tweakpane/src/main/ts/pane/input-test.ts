import {
	CheckboxController,
	Color,
	ColorController,
	forceCast,
	ListController,
	NumberTextController,
	Point2dController,
	PointNdTextController,
	SliderTextController,
	TextController,
	TpChangeEvent,
	TpError,
} from '@tweakpane/core';
import * as assert from 'assert';
import {describe as context, describe, it} from 'mocha';

import {Pane} from '..';
import {createTestWindow} from '../misc/test-util';

function createPane(): Pane {
	return new Pane({
		document: createTestWindow().document,
	});
}

describe(Pane.name, () => {
	[
		{
			errorType: 'nomatchingcontroller',
			key: 'baz',
			obj: {
				foo: 'bar',
			},
		},
		{
			errorType: 'nomatchingcontroller',
			key: 'foo',
			obj: {
				foo: null,
			},
		},
		{
			errorType: 'nomatchingcontroller',
			key: 'child',
			obj: {
				child: {
					foo: 'bar',
				},
			},
		},
	].forEach((testCase) => {
		context(
			`when adding input with params = ${JSON.stringify(
				testCase.obj,
			)} and key = ${JSON.stringify(testCase.key)}`,
			() => {
				it(`should throw '${testCase.errorType}' error`, () => {
					const pane = createPane();

					try {
						pane.addInput(testCase.obj, testCase.key);
						assert.fail('should not be called');
					} catch (ev) {
						assert.strictEqual(ev instanceof TpError, true);
						assert.strictEqual(ev.type, testCase.errorType);
					}
				});
			},
		);
	});

	[
		{
			expected: 456,
			params: {
				propertyValue: 123,
				newInternalValue: 456,
			},
		},
		{
			expected: 'changed',
			params: {
				propertyValue: 'text',
				newInternalValue: 'changed',
			},
		},
		{
			expected: true,
			params: {
				propertyValue: false,
				newInternalValue: true,
			},
		},
		{
			expected: '#224488',
			params: {
				propertyValue: '#123',
				newInternalValue: new Color([0x22, 0x44, 0x88], 'rgb'),
			},
		},
		{
			expected: 'rgb(0, 127, 255)',
			params: {
				propertyValue: 'rgb(10, 20, 30)',
				newInternalValue: new Color([0, 127, 255], 'rgb'),
			},
		},
	].forEach(({expected, params}) => {
		context(`when ${JSON.stringify(params)}`, () => {
			it('should pass right argument for change event (local)', (done) => {
				const pane = createPane();
				const obj = {foo: params.propertyValue};
				const bapi = pane.addInput(obj, 'foo');

				bapi.on('change', (ev) => {
					assert.strictEqual(ev instanceof TpChangeEvent, true);
					assert.strictEqual(ev.target, bapi);
					assert.strictEqual(ev.presetKey, 'foo');
					assert.strictEqual(ev.value, expected);
					done();
				});
				bapi.controller_.binding.value.rawValue = params.newInternalValue;
			});

			it('should pass right argument for change event (global)', (done) => {
				const pane = createPane();
				const obj = {foo: params.propertyValue};
				const bapi = pane.addInput(obj, 'foo');

				pane.on('change', (ev) => {
					assert.strictEqual(ev instanceof TpChangeEvent, true);
					assert.strictEqual(ev.presetKey, 'foo');
					assert.strictEqual(ev.value, expected);
					assert.strictEqual(ev.target, bapi);
					done();
				});
				bapi.controller_.binding.value.rawValue = params.newInternalValue;
			});
		});
	});

	it('should dispose input', () => {
		const PARAMS = {foo: 1};
		const pane = createPane();
		const bapi = pane.addInput(PARAMS, 'foo');
		bapi.dispose();
		assert.strictEqual(
			pane.controller_.view.element.querySelector('.tp-lblv'),
			null,
		);
	});

	it('should bind `this` within handler to input itself', (done) => {
		const PARAMS = {foo: 1};
		const pane = createPane();
		const bapi = pane.addInput(PARAMS, 'foo');
		bapi.on('change', function (this: any) {
			assert.strictEqual(this, bapi);
			done();
		});
		bapi.controller_.binding.value.rawValue = 2;
	});

	[
		// Number
		{
			args: {
				value: 3.14,
				params: {},
			},
			expectedClass: NumberTextController,
		},
		{
			args: {
				value: 3.14,
				params: {min: 0},
			},
			expectedClass: SliderTextController,
		},
		{
			args: {
				value: 3.14,
				params: {max: 100},
			},
			expectedClass: SliderTextController,
		},
		{
			args: {
				value: 3.14,
				params: {options: {bar: 1, foo: 0}},
			},
			expectedClass: ListController,
		},
		{
			args: {
				value: 3.14,
				params: {
					options: [
						{text: 'foo', value: 0},
						{text: 'bar', value: 1},
					],
				},
			},
			expectedClass: ListController,
		},
		// String
		{
			args: {
				value: 'foobar',
				params: {},
			},
			expectedClass: TextController,
		},
		{
			args: {
				value: 'foobar',
				params: {
					options: {baz: 'qux', foo: 'bar'},
				},
			},
			expectedClass: ListController,
		},
		{
			args: {
				value: '#112233',
				params: {view: 'text'},
			},
			expectedClass: TextController,
		},
		{
			args: {
				value: 'rgb(0, 100, 200)',
				params: {view: 'text'},
			},
			expectedClass: TextController,
		},
		// Boolean
		{
			args: {
				value: false,
				params: {},
			},
			expectedClass: CheckboxController,
		},
		{
			args: {
				value: true,
				params: {
					options: {off: false, on: true},
				},
			},
			expectedClass: ListController,
		},
		// Color
		{
			args: {
				value: '#00ff00',
				params: {},
			},
			expectedClass: ColorController,
		},
		{
			args: {
				value: 0x112233,
				params: {
					view: 'color',
				},
			},
			expectedClass: ColorController,
		},
		{
			args: {
				value: 0x11223344,
				params: {
					alpha: true,
					view: 'color',
				},
			},
			expectedClass: ColorController,
		},
		{
			args: {
				value: {r: 0, g: 127, b: 255},
				params: {},
			},
			expectedClass: ColorController,
		},
		{
			args: {
				value: {r: 0, g: 127, b: 255, a: 0.5},
				params: {},
			},
			expectedClass: ColorController,
		},
		// Point2d
		{
			args: {
				value: {x: 12, y: 34},
				params: {},
			},
			expectedClass: Point2dController,
		},
		// Point3d
		{
			args: {
				value: {x: 12, y: 34, z: 56},
				params: {},
			},
			expectedClass: PointNdTextController,
		},
		// Point4d
		{
			args: {
				value: {x: 12, y: 34, z: 56, w: 78},
				params: {},
			},
			expectedClass: PointNdTextController,
		},
	].forEach(({args, expectedClass}) => {
		context(`when params = ${JSON.stringify(args.params)}`, () => {
			it(`should return controller: ${expectedClass.name}`, () => {
				const pane = createPane();
				const obj = {foo: args.value};
				const bapi = pane.addInput(obj, 'foo', forceCast(args.params));
				assert.strictEqual(
					bapi.controller_.valueController instanceof expectedClass,
					true,
				);
			});
		});
	});
});
