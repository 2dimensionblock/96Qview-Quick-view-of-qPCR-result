import test from 'node:test';
import assert from 'node:assert/strict';
import Q96 from '../frontend/naming.cjs';

test('Every requested reference is recognized exactly and case-insensitively', () => {
  assert.equal(Q96.REFERENCES.length, 34);
  for (const gene of Q96.REFERENCES) {
    assert.ok(Q96.isReference(gene.toUpperCase()), gene);
    assert.ok(Q96.isReference(gene.toLowerCase()), gene);
    assert.equal(Q96.inferSample(gene.toLowerCase() + '-24').gene, gene);
  }
  for (const target of ['ACTB2', 'GAPDH-like', 'RPL13A2', 'GeneX']) assert.equal(Q96.isReference(target), false);
});
test('Two-part and three-part names support Unicode, units, and numeric maxima per dimension', () => {
  assert.deepEqual(Q96.inferSample('gapdh-24'), { gene: 'GAPDH', group: '默认组', time: '24' });
  assert.deepEqual(Q96.inferSample('目标基因-Control-24 h'), { gene: '目标基因', group: 'Control', time: '24 h' });
  assert.deepEqual(Q96.inferSample('18s rRNA_处理组_37°C'), { gene: '18S rRNA', group: '处理组', time: '37°C' });
  for (const values of [[0, 4, 8], [0, 4, 8, 24], [0, 8, 8.1]]) {
    const samples = values.map(time => 'GeneX-' + time), context = Q96.namingContext(samples);
    assert.deepEqual(samples.map(sample => Q96.inferSample(sample, context).time), values.map(String));
  }
  const samples = ['GeneX-1-0','GeneX-2-4','GeneX-8-24','GAPDH-1-24'];
  const context = Q96.namingContext(samples);
  assert.deepEqual(samples.map(sample => Q96.inferSample(sample, context).group), Array(4).fill('默认组'));
  assert.deepEqual(samples.map(sample => Q96.inferSample(sample, context).time), ['0','4','24','24']);
  assert.deepEqual(Q96.inferSample('GeneX-2-4', Q96.namingContext(['GeneX-1-0','GeneX-2-4'])), { gene: 'GeneX', group: '2', time: '4' });
  assert.deepEqual(Q96.inferSample('GeneX-10-24'), { gene: 'GeneX', group: '10', time: '24' });
  assert.equal(Q96.inferSample('24-1').gene, '');
});
test('Plate assignments preserve raw observations, handle numeric wells, and reject duplicate or invalid wells', () => {
  const source = [{ well: 'a01', id: '1', gene: '待指定', group: '默认组', time: '1', ct: 20, rawCt: '20.000', bio: 'B1', excluded: true }];
  const result = Q96.applyPlate(source, { A1: { gene: 'gapdh', value: '24', unit: 'h', kind: 'time' } });
  assert.deepEqual(result[0], { ...source[0], gene: 'GAPDH', group: '默认组', time: '24 h', groupKind: 'time', groupUnit: 'h' });
  assert.equal(source[0].gene, '待指定');
  assert.equal(Q96.wellKey('96'), 'H12');
  assert.equal(Q96.wellKey('13'), 'B1');
  assert.equal(Q96.wellKey('H13'), '');
  assert.throws(() => Q96.plateRows([...source, { ...source[0], well: 'A1' }]), /出现多次/);
  assert.throws(() => Q96.plateRows([{ well: 'A13' }]), /不属于/);
  assert.throws(() => Q96.applyPlate(source, { A1: { gene: '123', value: '24' } }), /完整命名/);
});
