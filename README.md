# React-vanilla as express template adapter

This package compiles react-vanilla jsx as templates for express.

Get all profits from react-vanilla DOM h function that is fully compatible with react h function.

## Usage

Basic server example is presented in `example` folder.

Here is `server.js` file contents:
```js
var express = require("express");
var { ExpressAdapter } = require('express-react-vanilla-adapter');

var path = require("path");

const app = express();

// Create `ExpressAdapter` and pass `app` for setting `GET` routes for built scripts
new ExpressAdapter({
  app: app,
  
  // default properties can be passed here
  html: 'html/index.html'
});

app.set("views", path.resolve(__dirname, "./views"));


app.get("/", (req, res) => {
  res.render("main", {
    message: "Hello World"
    // can use other `html` if needed
  });
});

app.use(express.static("public/"));

app.listen(3030, () => {
  console.log("express-react-vanilla example server listening on: 3030");
});
```


## DOM

React-vanilla DOM generates native dom elements.

```js
const myDiv = <div class="myDiv"></div>;
  
console.log(myDiv instanceof HTMLElement) // true
```

Under the hood this would be converted to code that do this:

```js
const myDiv = document.createElement('div');
myDiv.className = 'myDiv';
  
console.log(myDiv instanceof HTMLElement) // true
```

Event subscription implemented in a straight way. In this example after div would be clicked — it would change the text.

```js
const someValue = new Store.Value.String('Hello');

const myDiv = <div class="myDiv" onclick={_ => someValue.set('updated')}>{someValue}</div>;
```

Only changed properties would be changed.

### Class

You can use `class`, `className`, and `cls` for defining element's class. 

Object can be passed as class. In this case not falsy keys would be used as a class name.

```js
const useCls2 = new Store.Value.Boolean(true);

<div class={{cls1: true, cls2: useCls2}} onclick={_ => useCls2.toggle()}> Text </div>
```

Arrays can also be used

```js
const useCls2 = new Store.Value.Boolean(true);

<div class={['cls1', {cls2: useCls2}]} onclick={_ => useCls2.toggle()}> Text </div>
```

Arrays of elements would be inserted as children:
```js
var items = [1,2,3,4,5];

// list of items
<ul>
  {items.map(num => <li>{num}</li>)}
</ul>
```

### ArrayStore

Are items from upper example reactive? Yes and no. There is `Store.ArrayStore` is implemented. It is returned as a result of `array` method:

```js
var s = new Store({
  a: [10,100,1000]
});

// This would return ArrayStore
s.array('a')

// would return 100
s.array('a').get(1)
```

You can subscribe to adding and removing elements to ArrayStore. `push`, `pop`, `shift`, `unshift`, `shift`, `slice`, `splice`, `toArray` methods are implemented.

There is a `List` component that add, remove DOM children and does not modify unchanged elements.

## Store and Reactivity

`Store.Value.[Boolean|String|Number]` are handy simple atoms for creating components.

In more complicated cases use the full `Store` instance.

```js
var s = new Store({
  key1: false, 
  key2: 'Some value', 
  obj: { key3: true }
});

s.set('obj.key3', false); // values can be modified in this way
console.log( s.get('obj.key3') )// getting the value

// this would log initial value and  log them on all updates 
s.sub(['obj.key3', 'key1'], (key3, key1) => console.log({key3, key1}) );
```

`new Store.Value.*****` is actually returning typed hinted hook similar to
`s.val('obj.key3')`

### Hook functions
Hook function is a function that takes some outer callback as it's value and call it on every change.

Example:

```js
s.val('obj.key3')(console.log) // would log all changes of obj.key3

// similar concept:
s.sub(['obj.key3'], function(newVal){
  console.log(newVal);
});
```

A lot of usage test cases can be found in <a href="https://github.com/Zibx/react-vanilla/blob/master/test/store.js">Store tests</a>.

### How it actually works?

When `h` function take get any property — it checks if this property is a function. If it is a function — this function would be fed with a callback that would update the actual value when would be called.

Example:
```js
// would set div's class to "cls1"
<div class={ update => update('cls1') }></div>

// would update class every second and set cls1, cls2, ...
<div class={ update =>{
  var num = 1;
  setInterval(_ => { num++; update('cls'+num) }, 1000)
} }></div>

// TextNodes values would be setted in the same way
<div>{ update => update('Hello') } world</div>
```

Summing up — Store is just gives values that can be updated later.

## Conditions

`IF` tag can be used for switching DOM nodes:

```js
// can be defined globally
const {IF, AND, OR, NOT} = Store;

const cond = new Store.Value.Boolean(true);

<IF condition={s.val(['obj.key3'])}>
  Branch1
<ELSE/>
  Branch2
  <IF condition={cond}>
    SubBranch
  </IF>
</IF>
```

### Logical operations

`AND`, `OR`, `NOT` are built-in logical functions

```js
const a = new Store.Value.Boolean(true);
const b = new Store.Value.Boolean(false);

<IF condition={AND(a, b)}>
  A and B are true
</IF>

<IF condition={AND(a, NOT(b))}>
  A is true and B is false
</IF>
```

`AND` and `OR` can consume more arguments:
```js
var a1 = new Store.Value.Boolean(true);
var a2 = new Store.Value.Boolean(true);
var a3 = new Store.Value.Boolean(true);

AND(a1,a2,a3)(console.log)
// prints true

a2.set(false)
// prints false
```