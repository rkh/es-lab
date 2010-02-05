// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// A collection of useful traits

load('traits.js'); // provides Trait

// makeSeq is a function() -> Sequence
// where Sequence is an object c that understands c.push(elem)
// in order to append an element to the sequence
function makeEnumerableTrait(makeSeq) {
  return Trait.trait({
    // this.forEach(fun) passes each element and index to fun
    forEach: Trait.required,
    // this.reverseEach(f) -> pass elements to f in reverse order
    // needed for reduceRight only
    reverseEach: Trait.required,
 
    map: function(fun) {
      var seq = makeSeq();
      this.forEach(function(e,i) {
        seq.push(fun(e,i));
      });
      return seq;
    },
    every: function(pred) {
      this.forEach(function(e,i) {
        if (!pred(e,i)) {
          return false;
        }
      });
      return true;
    },
    some: function(pred) {
      this.forEach(function(e,i) {
        if (pred(e,i)) {
          return true;
        }
      });
      return false;
    },
    filter: function(pred) {
      var seq = makeSeq();
      this.forEach(function(e,i) {
        if (pred(e,i)) {
          seq.push(e);          
        }
      });
      return seq;
    },
    reduce: function(fun, optInit) {
      var result = optInit;
      this.forEach(function(e,i) {
        result = fun(result, e, i);
      });
      return result;
    },
    reduceRight: function(fun, optInit) {
      var result = optInit;
      this.reverseEach(function(e,i) {
        result = fun(result, e, i);
      });
      return result;
    },
    asSequence: function() {
      return this.map(function (e) { return e; });
    },
  })
}

// an enumerable trait that returns all sequences as arrays
var TEnumerable = makeEnumerableTrait(function() { return []; });

// a comparable trait that works on partially ordered data
// note: if two elements are incomparable, the relational operators
// will answer 'false' and the min and max operators will answer 'undefined'
var TComparable = Trait.trait({
  '<': Trait.required, // this['<'](other) -> boolean
 '==': Trait.required, // this['=='](other) -> boolean
  
 '<=': function(other) {
    return this['<'](other) || this['=='](other);
  },
  '>': function(other) {
    return other['<'](this);
  },
 '>=': function(other) {
    return other['<'](this) || this['=='](other);
  },
 '!=': function(other) {
    return !(this['=='](other));  
  },
  between: function(min, max) { // inclusive between
    return min['>='](this) && this['<='](max);
  },
  min: function(aMagnitude) {
    if (this['<='](aMagnitude)) {
      return this;
    } else if (aMagnitude['<'](this)) {
      return aMagnitude;
    } else {
      return undefined;
    }
  },
  max: function(aMagnitude) {
    if (this['<='](aMagnitude)) {
      return aMagnitude;
    } else if (aMagnitude['<'](this)) {
      return this;
    } else {
      return undefined;
    }
  }
});

// represents a closed interval [min, max]
function makeInterval(min, max) {  
  return Trait.create(Object.prototype,
    Trait.compose(
      TEnumerable,
      TComparable,
      Trait.trait({
        start: min,
        end: max,
        size: max - min,
        toString: function() { return '['+min+','+max+']'; },
        '<': function(ival) { return max < ival.start; },
        '==': function(ival) { return min === ival.start && max === ival.end; },
        contains: function(e) { return (min <= e) && (e <= max); },
        forEach: function(consumer) {
          for (var i = min; i <= max; i++) {
            consumer(i,i-min);
          }
        },
        reverseEach: function(consumer) {
          for (var i = max; i >= min; i--) {
            consumer(i,max-i);
          }        
        }
      })));
}

function testTraits() {
  load('../../tests/unit.js');
  var unit = makeUnitTest("TraitExamples", false);
  
  function testSameArray(arr1, arr2, id) {
    if (unit.compare(arr1.length, arr2.length, id+"isSameArray length")) {
      for (var i = 0; i < arr1.length; i++) {
        unit.compare(arr1[i], arr2[i], id+"isSameArray i="+i);
      }
    }
  }
  
  var i1 = makeInterval(0,5);
  var i2 = makeInterval(7,9);
  
  unit.compare(0, i1.start, "start");
  unit.compare(5, i1.end, "end");
  
  unit.compare(true, i1['<'](i2), "<");
  unit.compare(false, i1['=='](i2), "i1 == i2");
  unit.compare(true, i1['=='](i1), "i1 == i1");
  
  unit.compare(5, i1.size, "i1 size");
  
  unit.compare(true, i1['<='](i2), "i1 <= i2");
  unit.compare(false, i2['<='](i1), "i2 <= i1")
  unit.compare(true, i1['<='](i1), "i1 <= i1");
  
  unit.compare(false, i1['>='](i2), "i1 >= i2");
  unit.compare(true, i2['>='](i1), "i2 >= i1")
  unit.compare(true, i1['>='](i1), "i1 >= i1");

  unit.compare(false, i1['!='](i1), "i1 != i1");
  unit.compare(true, i1['!='](i2), "i1 != i2");
  
  unit.compare(true, i1.contains(0));
  unit.compare(true, i1.contains(1));
  unit.compare(true, i1.contains(5));
  unit.compare(false, i1.contains(-1));
  unit.compare(false, i1.contains(7));
  
  unit.compare(true, i1.between(i1,i1), 'i1 between i1 and i1');
  unit.compare(true, i1.between(i1,i2), 'i1 between i1 and i2');
  unit.compare(false, makeInterval(2,4).between(i1,i2), '[2,4] between i1 and i2');
  unit.compare(true, makeInterval(6,6).between(i1,i2), '[6,6] between i1 and i2');

  unit.compare(i1, i1.min(i2), "i1 min i2");
  unit.compare(i1, i2.min(i1), "i2 min i1");
  unit.compare(i2, i1.max(i2), "i1 max i2");
  unit.compare(i2, i2.max(i1), "i2 max i1");
  unit.compare(undefined, i1.min(makeInterval(3,7)), "i1 min [3,7]");

  unit.compare('[0,5]',''+i1, "i1 toString");

  testSameArray([0,1,2,3,4,5], i1.asSequence(), 'i1.asSequence');

  testSameArray([1,2,3,4,5,6], i1.map(function(e,i) { return e+1; }), 'map i1');
  testSameArray([0,1,2], i2.map(function(e,i) {return i; }), 'map i2');

  unit.compare(true, i1.every(function(e) { return e <= i1.end; }), 'i1.every <= end');
  unit.compare(false, i1.every(function(e) { return e%2 === 0; }), 'i1.every even');
  
  unit.compare(true, i1.some(function(e) { return e === 3; }), 'i1 some 3');
  unit.compare(false, i1.some(function(e) { return e < i1.start; }), 'i1 some < start');
  
  testSameArray([0,2,4], i1.filter(function(e) { return e%2 === 0; }), 'filter even');
  testSameArray([], i1.filter(function(e) { return false; }));
  testSameArray(i1.asSequence(), i1.filter(function(e) { return true; }));
  
  unit.compare(15, i1.reduce(function(sum, e) { return sum+e; }, 0), 'i1.reduce sum');
  unit.compare(3, i1.reduce(function(sum, e, i) { return sum+i; }, 0), 'i1.reduce sum idx');
  unit.compare('foo',
    makeInterval(0,0).reduce(function(tot,nxt) { return 'bar'; },'foo'),
    '[0,0].reduce');
  unit.compare(15,
    i1.reduceRight(function(sum, e) { return sum+e; }, 0),
    'i1.reduceRight sum');
  unit.compare('543210',
    i1.reduceRight(function(str,e) { return str+e; }, ''),
    'i1.reduceRight append');
  
  return unit.testDone();
}

testTraits();