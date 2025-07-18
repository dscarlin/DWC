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
        //this.pendingRender = true;
        this.render();
         //setTimeout(() =>this.render());
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
            console.log(...args)
        }
    }
    
    // Required for 2-way data binding
    setWatchers() {
        
        if(!this.watch || !Array.isArray(this.watch)) {
            return;
        }  
        
        
        // Function to recursively add getters and setters for properties
        function recursivelyAddProxyWatchers(context, propertyName, value, component) {
            const primitivePropertyValue = typeof value !== 'object' || value === null;
            // If the property is a primitive value, create a getter and setter
            if (primitivePropertyValue) {
              Object.defineProperty(context, propertyName, {
                get: function() {
                    return context['_' + propertyName];
                },
                set: function(value) {
                  if (primitivePropertyValue) {
                      context['_' + propertyName] = value;
                  } else {
                    //call recursivelyAddProxyWatchers on each property of the object
                    Object.keys(value).forEach(key => {
                        recursivelyAddProxyWatchers(value, key, value[key], component);
                    })
                  };
                  //if(!component.pendingRender){
                    //component.pendingRender = true;
                    component.render();
                 // }
                } 
              });
            } else {
              // If the property is an object, recursively add watchers to its properties
              Object.keys(value).forEach(key => {
                recursivelyAddProxyWatchers(value, key, value[key], component);
              });
            }
            context[propertyName] = value; // Initialize the property
            
        }
       
        const attributesToObserve = [];
        this.watch.forEach(([propertyName, value, observe]) => {
            
            if(observe) 
              attributesToObserve.push(propertyName)
            //recursively create getters and setters for each property
            recursivelyAddProxyWatchers(this, propertyName, value, this);
        });
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

    

   
  

  class MyGreeting extends Base {
    //Virtual - debug flag
    debug = true;
    get watch() {return [['name', 'David', 0],['simple', 1], ['object', { name: { first: 'David', last: 'Smith' } }], ['list', []]]; }

    // Virtual - run when populating the HTML 
    
    get HTML() {
        const listItem = item => `<div>${item.name}</div>`;
      // Use template literals to create the HTML content
        return `
        
        <input type="text" lstn="change:handleInput" placeholder="Enter your name" value="${this.name || ''}" />
        <my-greeting-inner list-list=${JSON.stringify(this.list)}></my-greeting-inner>
        <div><button  lstn="click:handleSimple">Simple ${this.simple}</button></div>
        <div><button  lstn="click:handleObject">Update Name</button></div>
        ${this.object?.name.first}
        <div><button  lstn="click:handleList">Update Name</button></div>

        ${this.list?.map(listItem).join('')}
        <p>Hello, <span id="name">${this.name}</span>!</p>
        `;
    }
    handleObject(){
      this.object.name.first += ' Bob';
    
    }
    handleSimple(){
      this.simple += 1;
    }
    handleList(){
      // Randomly update a name in the list  
      this.list.push({ name: 'New Item ' + (this.list.length + 1) });    
      this.render();
      this.list[Math.floor(Math.random()*this.list.length)].name += ' Bob';
     
    }
    handleInput(event) {
      // Update the name attribute when the input changes
      this.name =  event.target.value;
      
      
    }
    
    

    

    // Virtual - Handle attribute changes
    

    // Lifecycle method when added to the page
    connectedCallback() {
      // Initial render
      //this.render();
    }
  }

    class InnerGreeting extends Base {
      static get observedAttributes() { return ['list-list']; }
      get watch() { return [['list', [], 1]]; }
      get HTML(){
        return `
        <p>Inner List: <span id="name">Hello from inside!</span></p>
        
        `;
      }
    }


  // Define the custom element
    customElements.define('my-greeting-inner', InnerGreeting);

  customElements.define('my-greeting', MyGreeting);


  //page lands, calls server for data, determines which parent elements and pulls lists of depeneencies 
  //front end takes lists of dependencies and then constructs static resource calls and then adds elements to page

const kernel = document.getElementById('app');
kernel.innerHTML = '<my-greeting name="David"></my-greeting>';