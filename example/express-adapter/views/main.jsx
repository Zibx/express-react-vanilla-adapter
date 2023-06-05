import Button from 'components/button.jsx';

<>
  <div>
    <div>{input.message}</div>
    <Button value={'Click me'} onclick={_ => input.message.set('updated message')}></Button>
    <Button value={'Click me'} onclick={_ => input.message.set('updated message2')}></Button>
  </div>
  <div>A simple demo of updating an input value</div>
</>