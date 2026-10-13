import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../frontend/reference-controls.js', import.meta.url), 'utf8'), context);
test('Reference overrides are scoped to the selected gene and preserve exclusion, Ct and imported flags', () => {
  const rows = [
    {id:'1',gene:'GAPDH',ct:20,control:true,controlType:'阴性对照',referenceOverride:'GAPDH',excluded:true},
    {id:'2',gene:'GAPDH',ct:null,control:true,controlType:'Negative',referenceOverride:'GAPDH'},
    {id:'3',gene:'GAPDH',ct:30,control:true,controlType:'No Template Control',referenceOverride:'GAPDH'},
    {id:'4',gene:'ACTB',ct:20,control:true,controlType:'Negative',referenceOverride:'GAPDH'}
  ];
  const adjusted = context.Q96analysisRows(rows, 'GAPDH');
  assert.equal(adjusted[0].control, false);
  assert.equal(adjusted[0].excluded, true);
  assert.equal(adjusted[1].ct, null);
  assert.equal(adjusted[2].control, true);
  assert.equal(adjusted[3].control, true);
  assert.ok(rows.every(row => row.control), 'Do not mutate imported flags');
  assert.ok(context.Q96analysisRows(rows, 'ACTB').every(row => row.control));
});
