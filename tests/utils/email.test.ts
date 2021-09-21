import { expect } from 'chai';
import { inflate } from '../../src/utils/email';

describe('Test mail serialization', () => {
  it('should not generate table when dataset is empty', () => {
    expect(
      inflate({
        items: [],
      }),
    ).to.be.equal('');
  });

  it('should not generate table name when undefined', () => {
    expect(
      inflate({
        items: [
          {
            test: 'This is a test',
          },
        ],
      }),
    ).to.be.match(/^<tr><td></);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  it('should throw an error if component is invalid', () => expect(inflate.bind(null, <any>{})).to.throw());
});
