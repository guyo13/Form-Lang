# Form lang

A language for describing the structure and semantics of forms, and a toolchain for form code generation.

Why - writing software is a task where the programmer constantly has to keep in mind at least two levels of abstraction - Intent and computer language Semnatics (and syntax - which becomes instinctive with skill).

The Intent is the desired end result, the objective of programming. Computer languages were invented to enable this effort.

Form lang is an attempt to create a formal abstraction of the main building blocks of forms which can be used by different stakeholders to exchange information in a **formal** and **useful** manner . In that sense Form lang is what know as a _DSL_.

Forms are tools allowing humans and oragnization to collect information from other humans in a structured and organized manner. Forms too serve _domain specific_ purposes where the common intent is the collection of data in a **formal** format that is also useful for facilitating processes. **Forms are UI and Data strutures**.

## Defining the desired workflow

### A common scenario in the lifecycle of development teams

Product, developers and designers collaborate to define behaviours, looks and data inputs of **components**. This process is to a large degree influenced by the developers' tech stack and skill in various programming languages, frameworks and libraries. Often too this is an iterative process of creating a _Design system_ or component library. This is how teams create a common _visual_ standard or "language".

After iterating on the creation of some common building blocks, this is usually where product teams and developers part ways for a while and each carries on with their tasks. Developers will go on _writing code_ using their formal programming languages and toolchains while product managers and team leads try to _model_ the business problem space and try to come up with _structured_ solutions often involving user interfaces and forms for data collection.

#### The _Feature Description_

Developers and product managers then meet again to work on _features_ - implementations of the structured solution in code.
The feature description often invloves several media types, the most common being an **informal** (described in a natural language) and **abstract** (lacks implementation) description of behaviours, design files and PRDs. In order to map these descriptions into a correct, working, readable, testable and bug-free body of computer code, developers will usually go through multiple iterations of **interpretation** of the informal and abstract feature description, often writing some code to begin with and rewriting it as they get closer to the correct interpretation of the feature description.

This process, while natural is often _inefficient_ as developers' and product managers' skills _and the tools they use_ are vastly different with insufficient overlap between them.
Defining a _visual language_ is a good start but is insufficient for teams to efficiently exchange information to avoid the informal feature description.
For the purpose of data collection via forms teams can do better - as the visual language is already defined there is no need for design mockups. Teams need a way to accurately **compose** their visual elements in a way that speaks the visual language and describes the semantics of the form. This _formal description_ must be **useful** for all team members and enable individuals to iterate faster.

(The variance of this inefficiency across problem and solution domains is large and is affected also by individuals' - both developers and product managers - technical and soft skills, however by large it is the developer's responsibility to bridge the gap.)

### Algorithm - state creator

```python
def StateCreator(Form):
    for Node in IterateDfs(Form):
        if isField(Node):

```
### TODO
* Define main algorithm and desired outputs* - How to resolve <useStateHook> and <sliceId> at call site code generation time? when to generate call size code?
* Refactor code such that state manager creates a wrapper component for each field with the appropriate useZustandStore call
* Create a module generator that puts together the imports and the components and state
* Create a module generator that puts together all the state slices into a single store (collect them from all the top level forms in the Model)
* Import alias clash checks - Add component names when printing the clashing configs


### Data generation
Constraints:

* Generate only a single top-level form.
* Works with a static set of pre-defined component defs.
* Requires a set of hyperparameters.

Algorithm:

* Iterate Depth-First, start with an empty form definition.
* For each item off the frontier if the item is a Field, append it to its Parent Form.
* If the item is a Form, get its children and add them onto the frontier:
    * Assign $depth = parentDepth + 1$.
    * There is a probability of $\alpha^{d}$ of generating a random child Form where $0 \leq \alpha < 1$ and $d$ is the depth of the Field.
    * There is an optional parameter $D$ for defining the maximum depth for nested forms, which sets to $0$ the probability to generate a nested Form if its depth will be $D$. 
    * There is a probability of $1 - \alpha^{d}$ of generating a random child Field.
    * The number of generated children is a random number in the range of $[minChildren, maxChildren]$.
    * There is a probability of $\beta$ that a generated Field will contain a `state`.
      * There is a probability of $\gamma$ that a state definition will be an `array`.
        * The number of array elements will be chosen at random from the integer interval $[amin, amax]$. 
      * There is an equal probability of the state `type` to be any of the supported built-in types.
      * There is a probability of $\delta$ that a state definition will contain a `default` value.
        * If the `type` is `string` there is an $\epsilon$ probability of the default value to be defined as `as expression`, otherwise the probability is $1$.
* For each item off the frontier chose a random component from a set of available components.
  * Choose at random the number of assigned component props from the range $[0, ComponentPropCount]$.
    * For each assigned prop generate a random value with $\epsilon$ probability of the value to be defined as `as expression`

#### TODO - data generation
* Create an algorithm to randomly remove a node from the Form tree - recording the Parent and which child nodes came Before and After it if any.
* Create a formatter that formats the node in plain English.
* Create a function that generates a Training example:
  * Generate a random Form - $F$.
  * Serialize the Form to FormLang code - $s(F)$.
  * Randomly remove a child node, recording its surrounding context - $F \to (F', N, ctx(F, N))$.
  * Serialize the modified Form to FormLang code - $s(F')$. 
  * Generate a Prompt:
    * Serialize the removed child node into plain English - $eng(N)$.
    * Serialize the Parent, Before and After nodes' ids and node types (form/field) into plain English - $eng(ctx(F, N))$.
    * Create a Prompt consisting of the instruction to complete the given FormLang code, including the masked formlang code $s(F')$ and the generation instructions consisting of $eng(N), eng(ctx(F, N))$ as context - $P(F, F')$.
    * Output a dict consisting of $s(F), s(F'), P(F, F'), eng(N), eng(ctx(F, N))$
  * The function should allow accepting the configuration for the form generator - providing a default if not specified. 
* Export the function from the FormLang package and build it as an entrypoint.
* Create a Jupyter notebook with PythonMonkey and import the function and run it.
* Create an algorithm to generate `component` definitions.
