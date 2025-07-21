class Base extends HTMLElement {
    
    //Virtual - debug flag
    debug = true;

    // Required - component initialization
    constructor() {
        super();
        // Attach a shadow DOM
        this.attachShadow({ mode: 'open' });
        // Create recursive setters for properties in the watch list
        this.setWatchers();
        // Create content - timeout allows inherited components propeties to be initialized before rendering
        this.render();
    }
    // Required - Recursively add event listeners to child elements when HTML is rendered
    addEventListeners(children) {
        // Recursively process child nodes
        Array.from(children).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                // Add event listeners to elements with 'lstn' attribute
                if (child.hasAttribute('lstn')) {
                    const [event, method] = child.getAttribute('lstn').split(':');
                    if(typeof this[method] === 'function') {
                        child.addEventListener(event, this[method].bind(this));
                    }
                }
                // Recurse into child nodes
                this.addEventListeners(child.children);
            }
        });
    }

    // Required - Debugging method
    log(...args) {
        if(this.debug === true) {
            if(this.stackTrace) {
              console.trace(...args);
            } else {
              console.log(...args);
            }
        }
    }
    
    // Required for 2-way data binding
    setWatchers() {
        
        // Check if the watch property is defined and is an array
        if(!this.watch || !Array.isArray(this.watch)) {
            return;
        }  
        
        // Function to recursively add getters and setters for properties
        function recursivelyAddProxyWatchers(context, propertyName, value, component) {
            const primitivePropertyValue = typeof value !== 'object' || value === null;
            // If the property is a primitive value, create a getter and setter

            //HANDLES ALL GET/SET for objects on or within a watched property
            const handler = {
                get(target, property, receiver) {
                  if(!property) return '';
                  return Reflect.get(target, property, receiver);
                },
                set(target, property, value, receiver) {
                  if(!property ) return null;
                  const primitiveValue = typeof value !== 'object' || value === null;
                  if(!primitiveValue) {
                    // If the value is an object, recursively add watchers to its properties
                    Object.keys(value).forEach(key => {
                      recursivelyAddProxyWatchers(value, key, value[key], component);
                    });
                    value = new Proxy(value, handler); // Wrap the value in a proxy to handle nested properties
                  } 
                  if(component.initialized)
                    setTimeout(() => component.render(), 0);
                  return Reflect.set(target, property, value, receiver);
                }
      
              }
            
            // Creates getter/setter for all properties on the component that are being passed into the function
            // This allows for 2-way data binding
            // If the property is a primitive value, create a getter and setter
            // If the property is an object, create a proxy to handle nested properties
            // If the property is an array, create a proxy to handle array methods
            const watchedProperty = context.tagName === component.tagName;
            if(watchedProperty){
                Object.defineProperty(context, propertyName, {
                  get: function() {
                    return component['_' + propertyName];
                  },
                  set: function(value) {

                    const primitiveValue = typeof value !== 'object' || value === null;
                    if(!primitiveValue) {
                      // If the value is an object, recursively add watchers to its properties
                      Object.keys(value).forEach(key => {
                        recursivelyAddProxyWatchers(value, key, value[key], component);
                      });
                      component['_' + propertyName] = new Proxy(value, handler); // Store the value with a leading underscore

                    } else {
                      // If the value is a primitive, just set it directly
                      component['_' + propertyName] = value;
                    }
                    // If the component is initialized, re-render it
                    // This ensures that the component updates its display when properties change
                    // This is important for 2-way data binding
                    if(component.initialized)
                      component.render();
                  }
                } )
              }
            
            // If the property is a primitive value, set it directly on the context
            // this will trigger the getter/setter defined above
            if (primitivePropertyValue) {
              
              context[propertyName] = value;
            } else {
              // If the property is an object, recursively add watchers to its properties
              Object.keys(value).forEach(key => {
                recursivelyAddProxyWatchers(value, key, value[key], component);
              });
              context[propertyName] = new Proxy(value, handler);

            }
            
            
            
        }
       
        this.watch.forEach(([propertyName, value]) => { 
            recursivelyAddProxyWatchers(this, propertyName, value, this);
        });
        this.initialized = true;
    }

    // Required - Render method to update the content
    render(){
        //this.pendingRender = false;
        this.shadowRoot.innerHTML = this.HTML;
        // Add event listeners to the shadow DOM
        this.addEventListeners(this.shadowRoot.children);
        
    }

    // Virtual - individual component HTML template
    // This should be overridden in subclasses to provide specific HTML content
    // If not overridden, it will return an empty string
    // This is the main content of the component that will be rendered in the shadow DOM
    get HTML() {
        return `
        
        `;
    }

    // Virtual - list of properties to watch for changes
    // This should be overridden in subclasses to specify which properties to watch
    // If not overridden, it will return an empty array
    // This is used to trigger the render method when properties change
    // Each item in the array should be in the format ['propertyName', propertyValue]
    get watch() {
      return [/*['propertyName', propertyValue],...*/];
    }

    // Virtual - list of observed attributes    
    // This should be overridden in subclasses to specify which attributes to observe
    // If not overridden, it will return an empty array 
    // This is used to trigger the attributeChangedCallback when attributes change
    static get observedAttributes() {
        return [];
    }

    // Required - pass attribute updates as properties
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) {
        return; // No change, so do nothing
      }
      function kebabToCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      }
      this.log(`Attribute changed: ${name}, Old Value: ${oldValue}, New Value: ${newValue}`);
      function convertToType(value) {
        switch (typeof value) {
          case 'string':
            //handle boolean, null, and undefined string values
            if (value === 'true') return true;
            if (value === 'false') return false;
            if (value === 'null') return null;
            if (value === 'undefined') return undefined;
            // If it's a number, convert it to a number
            if (!isNaN(value) && !isNaN(parseFloat(value))) {
              return parseFloat(value);
            }
            // check if it's a JSON string by starting and ending characters for either object or array
            if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
              try {
                return JSON.parse(value);
              } catch (e) {
                return value; // Return the original string if parsing fails
              }
            }
            break;
          default:
            return value;
        }
      }
      this[kebabToCamelCase(name)] = convertToType(newValue);
    }
  }

    

   
  

  class GameBoard extends Base {
    //Virtual - debug flag
    debug = true;
    get watch() {
      return [
        ['char', '1F600'],
        ['players', []]
      ]; 
    }

    // Virtual - run when populating the HTML 
    
    get HTML() {
        const player = player => `<div><strong>${player.name}</strong>${player.sprites}</div>`;
      // Use template literals to create the HTML content
        return `
        <label style="display:block; font-weight: 800;"for="name">Player Name:</label>
        <input name="name" type="text" lstn="input:handleInput" placeholder="New Player Name" value="${this.playerName || ''}" />
        <button  lstn="click:addPlayer">Add Player</button>
        <div>Character: <span style="font-size: 24px;" id="char">&#x${this.char}</span></div>
        <button  lstn="click:decrementChar"><</button>
        <button  lstn="click:incrementChar">></button>

        <button  lstn="click:handleAction">Go!!!</button>
        <button  lstn="click:handleReset">Reset!!!</button>
        
        ${this.players?.map(player).join('')}
        `;
    }
    handleReset(){  
      this.players.forEach(player => player.sprites = '');
    }
    handleAction(){
      const randomPlayer = this.players[Math.floor(Math.random()*this.players.length)]
      randomPlayer.sprites = randomPlayer.sprites + ' &#x' + randomPlayer.sprite;

    
    }
    incrementChar(e){
      const hexVals =  '0123456789ABCDEF';
      let toInc = this.char.substring(this.char.length - 2, this.char.length);
      const lastCharIndex = hexVals.indexOf(toInc[1]);
      if(lastCharIndex == hexVals.length - 1){
        const charTwo = hexVals[0];
        const charOne = hexVals[hexVals.indexOf(toInc[0]) + 1];
        toInc = charOne + charTwo;
      } else {
        toInc = toInc[0] + hexVals[lastCharIndex + 1];
      }
      this.char = this.char.substring(0, this.char.length - 2) + toInc;
    }
    decrementChar(e){
      if(this.char == '1F600'){ return; }
      const hexVals =  '0123456789ABCDEF';
      let toDec = this.char.substring(this.char.length - 2, this.char.length);
      const lastCharIndex = hexVals.indexOf(toDec[1]);
      if(lastCharIndex == 0){
        const charTwo  = hexVals[hexVals.length - 1];
        const charOne = hexVals[hexVals.indexOf(toDec[0]) - 1];
        toDec = charOne + charTwo;
      } else {
        toDec = toDec[0] + hexVals[lastCharIndex - 1];
      }
      this.char = this.char.substring(0, this.char.length - 2) + toDec;
    }
    addPlayer(){
      this.players.push({ name: this.playerName, sprites: '', sprite: this.char });  
      this.playerName = '';
      this.char = '1F600'; // Reset character to default
      this.render();
    }
    
    handleInput(event) {
      // Update the name attribute when the input changes
      this.playerName =  event.target.value;
    }
    
  }

    



  customElements.define('game-board', GameBoard);


  //page lands, calls server for data, determines which parent elements and pulls lists of depeneencies 
  //front end takes lists of dependencies and then constructs static resource calls and then adds elements to page

const kernel = document.getElementById('app');
kernel.innerHTML = '<game-board></game-board>';