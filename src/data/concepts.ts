// Seed graph: "How Modern AI Actually Works".
// Cluster colours are the validated dark-surface categorical set, in fixed order.

export type ClusterId = 'foundations' | 'representation' | 'transformer' | 'training' | 'inference' | 'generative' | 'frontier' | 'custom';

export interface Cluster { id: ClusterId; name: string; color: string; blurb: string }

export const CLUSTERS: Cluster[] = [
  { id: 'foundations', name: 'Foundations', color: '#3987e5', blurb: 'How a pile of numbers learns anything at all.' },
  { id: 'representation', name: 'Representation', color: '#d95926', blurb: 'Turning language into geometry.' },
  { id: 'transformer', name: 'Transformer', color: '#199e70', blurb: 'The architecture behind every modern language model.' },
  { id: 'training', name: 'Training', color: '#c98500', blurb: 'Where the capability actually comes from.' },
  { id: 'inference', name: 'Inference', color: '#d55181', blurb: 'What happens when you press enter.' },
  { id: 'generative', name: 'Generative', color: '#008300', blurb: 'Beyond text: images, audio, everything.' },
  { id: 'frontier', name: 'Frontier', color: '#9085e9', blurb: 'What nobody fully understands yet.' },
  { id: 'custom', name: 'Yours', color: '#c3c2b7', blurb: 'Concepts you added.' },
];

export const clusterOf = (id: ClusterId) => CLUSTERS.find((c) => c.id === id) ?? CLUSTERS[CLUSTERS.length - 1];

export type VizType =
  | 'neuron' | 'network' | 'activation' | 'lossfit' | 'surface3d' | 'polyfit' | 'tokenizer' | 'embed3d'
  | 'positional' | 'attention' | 'stepper' | 'context' | 'nexttoken' | 'bars' | 'scaling' | 'diffusion' | 'none';

export interface Concept {
  id: string;
  title: string;
  cluster: ClusterId;
  summary: string;
  steps: { h: string; p: string }[];
  viz: { type: VizType; variant?: string; caption: string };
  quiz?: { q: string; options: string[]; answer: number; why: string };
  reflect: string;
  minutes: number;
  user?: boolean;
}

const c = (x: Concept) => x;

export const CONCEPTS: Concept[] = [
  /* ------------------------------ Foundations ------------------------------ */
  c({
    id: 'neuron', title: 'The Artificial Neuron', cluster: 'foundations', minutes: 4,
    summary: 'A weighted sum followed by a squash. The atom every network is built from.',
    steps: [
      { h: 'The idea', p: 'A neuron takes a few numbers in, multiplies each by a weight that says how much it cares about that input, adds them up with a bias, and passes the total through a simple function. One number comes out.' },
      { h: 'How it works', p: 'output = f(w₁x₁ + w₂x₂ + … + b). The weights and the bias are the only things that ever change during learning. The function f, the activation, decides how the total turns into a signal: silent below some threshold, louder above it.' },
      { h: 'Why it matters', p: 'One neuron can only draw a straight line through its inputs. That is nearly useless alone. But stack millions and the lines fold into any shape you like. Everything a model "knows" is stored in these weights, nowhere else.' },
    ],
    viz: { type: 'neuron', caption: 'Drag the weights and bias. Watch when the neuron decides to fire.' },
    quiz: { q: 'During training, which parts of a neuron change?', options: ['The inputs', 'The weights and the bias', 'The activation function', 'Nothing, neurons are fixed'], answer: 1, why: 'Inputs come from the data and the activation function is chosen up front. Learning is nothing but adjusting weights and biases.' },
    reflect: 'Where in your own thinking do you "weight" some inputs far more than others?',
  }),
  c({
    id: 'network', title: 'Neural Networks', cluster: 'foundations', minutes: 5,
    summary: 'Layers of neurons, each one re-describing the output of the last.',
    steps: [
      { h: 'The idea', p: 'Arrange neurons in layers. Every neuron in a layer looks at all the outputs of the layer before it. The first layer sees raw data, the last layer gives the answer, and the ones between are free to invent whatever intermediate descriptions help.' },
      { h: 'How it works', p: 'A forward pass is just repeated matrix multiplication: multiply by the weights, add a bias, apply the activation, hand the result on. Early layers end up detecting simple patterns, later layers combine them into abstract ones. Nobody programs this hierarchy. It falls out of training.' },
      { h: 'Why it matters', p: 'With enough neurons a network can approximate any function. The hard question was never "can it represent the answer" but "can we find the weights". That search is what the rest of this cluster is about.' },
    ],
    viz: { type: 'network', variant: 'forward', caption: 'A forward pass. Signals flow left to right; brightness is activation.' },
    quiz: { q: 'What do the hidden layers of a network compute?', options: ['Rules written by engineers', 'Copies of the input', 'Intermediate features discovered during training', 'Random noise'], answer: 2, why: 'Hidden layers learn their own useful intermediate representations. Nobody specifies them by hand.' },
    reflect: 'What "intermediate features" did you have to build before you could understand this topic?',
  }),
  c({
    id: 'activation', title: 'Activation Functions', cluster: 'foundations', minutes: 3,
    summary: 'The small bend that makes deep networks more than one big linear equation.',
    steps: [
      { h: 'The idea', p: 'If neurons only added and multiplied, a hundred layers would collapse into a single straight-line transformation. The activation function adds a bend after each neuron, and bends compose into curves.' },
      { h: 'How it works', p: 'ReLU, the default, is almost comically simple: negative numbers become zero, positive numbers pass through. Sigmoid and tanh squash into a fixed range. GELU, used in transformers, is a smooth ReLU.' },
      { h: 'Why it matters', p: 'The choice affects whether learning signals survive a trip through many layers. Sigmoids flatten out and starve deep networks of gradient. ReLU keeps the signal alive, which is a large part of why deep learning started working around 2012.' },
    ],
    viz: { type: 'activation', caption: 'Switch between functions. Notice where each one goes flat: that is where learning stalls.' },
    quiz: { q: 'Why can\'t a deep network work without non-linear activations?', options: ['It would be too slow', 'Stacked linear layers collapse into one linear layer', 'The weights would explode', 'It would memorise the data'], answer: 1, why: 'A linear function of a linear function is still linear. Depth only adds power when there is a bend between layers.' },
    reflect: 'ReLU is one line of code that unlocked a field. What is the smallest change that ever unlocked something large for you?',
  }),
  c({
    id: 'loss', title: 'Loss Functions', cluster: 'foundations', minutes: 4,
    summary: 'One number that says how wrong the model is. Training exists to shrink it.',
    steps: [
      { h: 'The idea', p: 'To improve, a model needs a score. The loss function compares what the model predicted with what was true and returns a single number: zero for perfect, larger for worse.' },
      { h: 'How it works', p: 'For predicting numbers, a common choice is mean squared error: average the squared distances. For predicting categories or the next word, cross-entropy: how surprised was the model by the right answer? Confident and wrong is punished hardest.' },
      { h: 'Why it matters', p: 'The model optimises exactly what you measure, not what you meant. Every strange behaviour of an AI system can be traced back to some gap between the loss it was trained on and the thing people actually wanted.' },
    ],
    viz: { type: 'lossfit', caption: 'Tilt the line. The red bars are the errors; the loss is their squared average.' },
    quiz: { q: 'Cross-entropy loss punishes the model most when it is…', options: ['Uncertain and wrong', 'Confident and wrong', 'Confident and right', 'Uncertain and right'], answer: 1, why: 'Assigning near-zero probability to the true answer produces a very large loss. Confidence is only rewarded when it is earned.' },
    reflect: 'What is the "loss function" you are actually optimising in your work, versus the one you say you are?',
  }),
  c({
    id: 'gradient-descent', title: 'Gradient Descent', cluster: 'foundations', minutes: 5,
    summary: 'Feel which way is downhill, take a small step, repeat a few billion times.',
    steps: [
      { h: 'The idea', p: 'Picture the loss as a landscape where every position is a setting of all the weights and the height is how wrong the model is. Training is walking downhill in fog: you cannot see the valley, but you can feel the slope under your feet.' },
      { h: 'How it works', p: 'The gradient is that slope: for every weight, would nudging it up make the loss rise or fall, and by how much? Step each weight a little against its gradient. The step size is the learning rate. Too small and you crawl; too large and you bounce out of the valley.' },
      { h: 'Why it matters', p: 'This one loop trains every model you have heard of. In practice it uses random mini-batches of data (stochastic gradient descent) and adaptive step sizes (Adam), but the idea has not changed since the 1950s.' },
    ],
    viz: { type: 'surface3d', caption: 'Change the learning rate and drop the ball again. Drag to orbit the landscape.' },
    quiz: { q: 'What happens when the learning rate is far too large?', options: ['Training is just slower', 'The model overshoots and the loss can diverge', 'The model memorises the data', 'Nothing changes'], answer: 1, why: 'Steps that are too big jump clean over the valley and can climb the far wall, each time higher.' },
    reflect: 'Where are you taking steps that are too large to converge, or too small to arrive?',
  }),
  c({
    id: 'backprop', title: 'Backpropagation', cluster: 'foundations', minutes: 5,
    summary: 'How blame for an error is passed backwards through every layer.',
    steps: [
      { h: 'The idea', p: 'Gradient descent needs the slope for every weight, and a model may have billions. Backpropagation computes all of them in a single backward sweep, at roughly the cost of one forward pass.' },
      { h: 'How it works', p: 'It is the chain rule from calculus, applied with good bookkeeping. Start at the loss, ask how much each output neuron contributed, then how much each neuron feeding those contributed, and so on back to the input. Each layer reuses the work of the one after it.' },
      { h: 'Why it matters', p: 'Without it, training large networks would be computationally hopeless. Modern frameworks do it automatically (autograd), so researchers write the forward pass and the backward pass comes free.' },
    ],
    viz: { type: 'network', variant: 'backward', caption: 'The error signal flows right to left, splitting by how much each connection contributed.' },
    quiz: { q: 'Backpropagation is essentially an efficient application of…', options: ['Bayes\' theorem', 'The chain rule', 'Matrix inversion', 'Random search'], answer: 1, why: 'It applies the chain rule layer by layer, reusing intermediate results so every gradient costs one sweep.' },
    reflect: 'When something fails, how far back do you trace the cause before you stop?',
  }),
  c({
    id: 'overfitting', title: 'Overfitting & Generalisation', cluster: 'foundations', minutes: 4,
    summary: 'Memorising the exam answers is not the same as learning the subject.',
    steps: [
      { h: 'The idea', p: 'A model that is flexible enough can drive its training loss to zero by memorising every example, noise included. It then fails on anything new. What we want is generalisation: doing well on data it has never seen.' },
      { h: 'How it works', p: 'Hold some data back and never train on it. If training loss keeps falling while held-out loss starts rising, the model has begun memorising. Remedies: more data, regularisation, dropout, stopping early.' },
      { h: 'Why it matters', p: 'Strangely, enormous modern models generalise better than classical theory predicted. Why that happens is still an open research question. But the discipline of held-out evaluation is why you can trust a benchmark at all.' },
    ],
    viz: { type: 'polyfit', caption: 'Raise the model\'s flexibility. At some point it stops finding the trend and starts chasing noise.' },
    quiz: { q: 'Which is the clearest sign of overfitting?', options: ['Training loss and test loss both high', 'Training loss low, test loss rising', 'Training loss rising', 'Both losses falling together'], answer: 1, why: 'A widening gap between performance on seen and unseen data means the model is memorising rather than learning.' },
    reflect: 'What have you memorised without understanding? How would you test the difference?',
  }),

  /* ----------------------------- Representation ---------------------------- */
  c({
    id: 'tokens', title: 'Tokens', cluster: 'representation', minutes: 3,
    summary: 'Models do not read letters or words. They read sub-word chunks.',
    steps: [
      { h: 'The idea', p: 'Text has to become numbers. Whole words would need an endless vocabulary; single characters would make sequences painfully long. Tokens are the compromise: frequent words stay whole, rare ones split into reusable pieces.' },
      { h: 'How it works', p: 'A tokenizer is trained before the model, typically with byte-pair encoding: start with characters, then repeatedly merge the most frequent neighbouring pair into a new token. After tens of thousands of merges, "the" is one token and "tokenisation" is three.' },
      { h: 'Why it matters', p: 'Limits, prices and speed are all counted in tokens. It also explains odd failures: a model asked to count the letters in a word never saw the letters, only two or three opaque chunks.' },
    ],
    viz: { type: 'tokenizer', caption: 'Type anything. Common words stay whole, unusual ones fall apart into pieces.' },
    quiz: { q: 'Why do language models struggle to count letters in a word?', options: ['They cannot do arithmetic', 'They see tokens, not individual characters', 'Their context is too short', 'Letters are filtered out'], answer: 1, why: 'A word usually arrives as one to three tokens. The spelling inside each token is not directly visible to the model.' },
    reflect: 'What are the "tokens" of your field: the chunks an expert sees that a beginner does not?',
  }),
  c({
    id: 'embeddings', title: 'Embeddings', cluster: 'representation', minutes: 5,
    summary: 'Every token becomes a point in space, and meaning becomes distance.',
    steps: [
      { h: 'The idea', p: 'Each token is mapped to a long list of numbers, a vector, which is a position in a space with hundreds or thousands of dimensions. Tokens used in similar ways end up near each other.' },
      { h: 'How it works', p: 'The vectors start random and are adjusted by training like any other weight. Nobody tells the model that "cat" and "kitten" are related. Placing them close simply makes its predictions better, so that is where they drift.' },
      { h: 'Why it matters', p: 'Directions in this space carry meaning: the step from "king" to "queen" resembles the step from "man" to "woman". Search, recommendations and retrieval all work by measuring distance between embeddings.' },
    ],
    viz: { type: 'embed3d', variant: 'words', caption: 'A 3D slice of an embedding space. Drag to rotate; hover a point to see its neighbours.' },
    quiz: { q: 'How do embeddings come to encode meaning?', options: ['Linguists label each dimension', 'They are copied from a dictionary', 'Training moves useful-together tokens closer', 'They are fixed random numbers'], answer: 2, why: 'Embeddings are learned weights. Geometry emerges because it helps prediction.' },
    reflect: 'If your ideas were points in space, which two that feel unrelated might actually sit close together?',
  }),
  c({
    id: 'positional', title: 'Positional Encoding', cluster: 'representation', minutes: 3,
    summary: 'Attention has no sense of order, so order has to be written into the input.',
    steps: [
      { h: 'The idea', p: 'A transformer looks at all tokens at once. Left alone, "dog bites man" and "man bites dog" would look identical: the same bag of tokens. Position has to be added as information.' },
      { h: 'How it works', p: 'Each position gets its own pattern, which is combined with the token\'s embedding. The original recipe used sine waves of different frequencies, like the hands of many clocks ticking at different speeds. Modern models rotate vectors by position instead (RoPE).' },
      { h: 'Why it matters', p: 'How position is encoded decides how well a model copes with long documents and with lengths it never saw in training.' },
    ],
    viz: { type: 'positional', caption: 'Each row is a position, each column a dimension. Every position gets a unique fingerprint.' },
    quiz: { q: 'Why does a transformer need positional information added?', options: ['To save memory', 'Attention alone is blind to word order', 'To speed up training', 'To shrink the vocabulary'], answer: 1, why: 'Attention treats its input as a set. Without position signals, any shuffling of the words would look the same.' },
    reflect: 'How much of what you know depends on the order you learned it in?',
  }),
  c({
    id: 'latent', title: 'Latent Space', cluster: 'representation', minutes: 4,
    summary: 'The model\'s private coordinate system, where concepts are directions.',
    steps: [
      { h: 'The idea', p: 'Inside a network, data is turned into internal vectors that no human designed. The space those vectors live in is the latent space: a compressed map of everything the model has learned to distinguish.' },
      { h: 'How it works', p: 'Nearby points decode to similar things. Move smoothly between two points and the output morphs smoothly too: one face into another, one writing style into another. Many concepts turn out to be straight-line directions.' },
      { h: 'Why it matters', p: 'Generation is navigation in latent space. Steering a model, editing an image and finding similar documents are all the same act: moving a point.' },
    ],
    viz: { type: 'embed3d', variant: 'latent', caption: 'Clusters of meaning. Regions between clusters blend their neighbours.' },
    quiz: { q: 'What happens if you move smoothly between two points in a well-formed latent space?', options: ['Output jumps randomly', 'Output changes smoothly between the two', 'The model crashes', 'Nothing changes'], answer: 1, why: 'A good latent space is continuous: small moves produce small, meaningful changes.' },
    reflect: 'What are the two or three hidden "axes" along which you sort new ideas?',
  }),

  /* ------------------------------ Transformer ------------------------------ */
  c({
    id: 'attention', title: 'Attention', cluster: 'transformer', minutes: 6,
    summary: 'Every word asks every other word: how relevant are you to me?',
    steps: [
      { h: 'The idea', p: 'In "The animal didn\'t cross the street because it was too tired", what does "it" refer to? To answer, a word has to consult the other words. Attention is the mechanism that lets each token pull in information from the tokens that matter to it.' },
      { h: 'How it works', p: 'Each token emits a query ("what am I looking for?") and a key ("what do I offer?"). Matching a query against every key gives a relevance score. The scores are normalised into weights that sum to one, and the token updates itself with a weighted blend of the others\' values.' },
      { h: 'Why it matters', p: 'Older models passed information along the sentence one step at a time, and it faded with distance. Attention connects any two tokens directly, however far apart, and runs in parallel. That one change is what the title "Attention Is All You Need" was claiming.' },
    ],
    viz: { type: 'attention', variant: 'single', caption: 'Click a word to see where it looks. Try "it".' },
    quiz: { q: 'In attention, what determines how much one token draws from another?', options: ['Their distance in the sentence', 'How well one\'s query matches the other\'s key', 'Alphabetical order', 'A fixed rule per word'], answer: 1, why: 'Relevance is computed from learned query and key vectors, so it depends on content, not position alone.' },
    reflect: 'Reading this sentence, which earlier idea did your own attention reach back for?',
  }),
  c({
    id: 'multihead', title: 'Multi-Head Attention', cluster: 'transformer', minutes: 4,
    summary: 'Many attention patterns at once, each tracking a different relationship.',
    steps: [
      { h: 'The idea', p: 'One attention pattern can only focus on one kind of relationship. Language has many at once: grammar, reference, topic, tone. So a transformer runs many attention "heads" side by side.' },
      { h: 'How it works', p: 'Each head has its own query, key and value weights, and so learns its own pattern. One may link verbs to their subjects, another pronouns to names, another simply the previous token. Their outputs are concatenated and mixed.' },
      { h: 'Why it matters', p: 'Heads are among the few parts of a model people can partly read. Finding a head that tracks, say, matching brackets is a real glimpse of an algorithm the model invented on its own.' },
    ],
    viz: { type: 'attention', variant: 'heads', caption: 'Same sentence, three heads. Switch heads and click a word.' },
    quiz: { q: 'Why use several attention heads instead of one large one?', options: ['It uses less memory', 'Different heads can track different relationships simultaneously', 'It removes the need for training', 'Tradition'], answer: 1, why: 'Separate heads specialise. One head would have to average all relationships into one blurry pattern.' },
    reflect: 'How many "heads" are you running when you listen to someone: the words, the tone, what is left unsaid?',
  }),
  c({
    id: 'block', title: 'The Transformer Block', cluster: 'transformer', minutes: 5,
    summary: 'Attention to gather, a small network to think, a shortcut to remember. Repeat.',
    steps: [
      { h: 'The idea', p: 'A transformer is one block design repeated dozens of times. Each block does two things: tokens exchange information (attention), then each token processes what it gathered on its own (a feed-forward network).' },
      { h: 'How it works', p: 'Around each step runs a residual connection: the block\'s output is added to its input rather than replacing it. This creates a shared stream that every layer reads from and writes to. Normalisation keeps the numbers in a stable range.' },
      { h: 'Why it matters', p: 'Residual connections are why you can stack a hundred layers and still train them: gradients flow straight down the shortcut. The feed-forward layers hold most of the parameters, and seem to be where much factual knowledge is stored.' },
    ],
    viz: { type: 'stepper', variant: 'block', caption: 'Step through one block and follow a token\'s vector.' },
    quiz: { q: 'What does a residual connection do?', options: ['Deletes unused neurons', 'Adds a layer\'s input to its output', 'Shuffles the tokens', 'Compresses the vocabulary'], answer: 1, why: 'By adding instead of replacing, each layer only needs to learn a small correction, and gradients have a direct path.' },
    reflect: 'Gather, then process, then keep what you had. Does your learning routine have all three?',
  }),
  c({
    id: 'context', title: 'The Context Window', cluster: 'transformer', minutes: 3,
    summary: 'Everything the model can see at once. Outside it, nothing exists.',
    steps: [
      { h: 'The idea', p: 'A model has no memory between calls. All it knows about your conversation is the text currently in its context window: the system prompt, the history, your files, and its own reply so far.' },
      { h: 'How it works', p: 'The window is measured in tokens. Attention compares every token with every other, so cost grows quickly with length. When a conversation exceeds the limit, the oldest parts must be dropped or summarised.' },
      { h: 'Why it matters', p: '"Memory" features are built on top: retrieving relevant notes and placing them back into the window. What goes into the context, and what is left out, is the main lever anyone has over a model\'s behaviour.' },
    ],
    viz: { type: 'context', caption: 'Shrink the window. Watch the model lose the start of the conversation.' },
    quiz: { q: 'What happens to information that falls outside the context window?', options: ['It is stored in long-term memory', 'The model cannot see it at all', 'It is compressed into the weights', 'It is still partly visible'], answer: 1, why: 'The weights are frozen at inference. Anything not in the window does not exist for that call.' },
    reflect: 'What is in your own context window right now that should not be?',
  }),

  /* -------------------------------- Training ------------------------------- */
  c({
    id: 'pretraining', title: 'Pretraining: Predict the Next Token', cluster: 'training', minutes: 5,
    summary: 'A deceptively simple game that, played at scale, forces understanding.',
    steps: [
      { h: 'The idea', p: 'Take a vast amount of text. Hide what comes next. Ask the model to guess. Compare with the truth, adjust the weights, repeat trillions of times. That is the whole of pretraining.' },
      { h: 'How it works', p: 'No labels are needed: the text is its own answer key (self-supervised learning). The model outputs a probability for every token in its vocabulary, and cross-entropy loss pushes probability towards the token that really came next.' },
      { h: 'Why it matters', p: 'To predict the next word of a physics proof, a legal argument or a joke, it helps to model physics, law and humour. Prediction is the task; a compressed model of the world that wrote the text is the side effect.' },
    ],
    viz: { type: 'nexttoken', caption: 'Pick the next token and see how the distribution shifts with context.' },
    quiz: { q: 'Why does next-token prediction need no human-written labels?', options: ['Labels are generated by another AI', 'The next token in the text is the label', 'It is unsupervised clustering', 'Labels are added later'], answer: 1, why: 'Any text supplies its own targets, which is what makes training on internet-scale data possible.' },
    reflect: 'What simple practice, repeated enough, has taught you something far bigger than itself?',
  }),
  c({
    id: 'finetuning', title: 'Fine-Tuning', cluster: 'training', minutes: 4,
    summary: 'Take a model that knows everything roughly and make it good at one thing.',
    steps: [
      { h: 'The idea', p: 'Pretraining is slow and expensive; it produces a generalist. Fine-tuning continues training briefly on a small, focused dataset so the model adopts a format, a tone or a speciality.' },
      { h: 'How it works', p: 'Same loop, smaller learning rate, far less data. Often only a thin set of added weights is trained (LoRA) while the original model stays frozen, which is cheap and easy to swap.' },
      { h: 'Why it matters', p: 'Turning a raw text predictor into an assistant that answers questions is itself fine-tuning, on examples of helpful dialogue. The risk is forgetting: push too hard on the new data and general ability erodes.' },
    ],
    viz: { type: 'bars', variant: 'finetune', caption: 'Slide from the generalist towards the specialist and watch the output distribution sharpen.' },
    quiz: { q: 'What is the main risk of aggressive fine-tuning?', options: ['The model gets larger', 'It forgets general abilities', 'It stops using tokens', 'It becomes slower'], answer: 1, why: 'Over-fitting to a narrow dataset can overwrite broad knowledge: catastrophic forgetting.' },
    reflect: 'Which of your general skills are you fine-tuning right now, and what might you be forgetting?',
  }),
  c({
    id: 'rlhf', title: 'Learning from Human Feedback', cluster: 'training', minutes: 4,
    summary: 'People rank answers; the model learns to produce what people rank highly.',
    steps: [
      { h: 'The idea', p: 'There is no formula for "a good answer". But people can compare two answers and say which is better. Enough comparisons, and you can train on taste.' },
      { h: 'How it works', p: 'Human preferences train a second model that scores answers (a reward model). The language model is then tuned with reinforcement learning to write answers that score well. Variants use written principles instead of rankings.' },
      { h: 'Why it matters', p: 'This is where helpfulness, honesty and refusals come from. It is also the loss-function problem again: optimise "what raters approve of" and you can get flattery and confident-sounding answers instead of true ones.' },
    ],
    viz: { type: 'bars', variant: 'rlhf', caption: 'Increase the feedback signal. Preferred styles of answer gain probability.' },
    quiz: { q: 'What does the reward model in RLHF learn to do?', options: ['Generate text', 'Predict which answers humans prefer', 'Tokenise input', 'Compress the weights'], answer: 1, why: 'It turns scattered human judgements into a score that can be optimised automatically.' },
    reflect: 'Whose approval are you being trained on? Is it the same thing as being right?',
  }),
  c({
    id: 'scaling', title: 'Scaling Laws', cluster: 'training', minutes: 4,
    summary: 'More data, more parameters, more compute: improvement so regular you can plot it.',
    steps: [
      { h: 'The idea', p: 'Across many orders of magnitude, a model\'s loss falls along a smooth, predictable curve as you add parameters, data and compute. Progress became something you could forecast with a ruler.' },
      { h: 'How it works', p: 'On a log-log plot the relationship is close to a straight line: a power law. Each tenfold increase buys a similar-sized improvement. The three ingredients must grow together; starve one and the curve flattens.' },
      { h: 'Why it matters', p: 'This is why AI progress turned into an engineering and capital race. The open question is how long the line continues, and whether smooth gains in loss keep translating into leaps in ability.' },
    ],
    viz: { type: 'scaling', variant: 'power', caption: 'Scale the model up. Each step along the axis is ten times more compute.' },
    quiz: { q: 'A scaling law on a log-log plot looks roughly like…', options: ['A circle', 'A straight line', 'A random walk', 'A step function'], answer: 1, why: 'Power laws become straight lines on log-log axes, which is what makes them easy to extrapolate.' },
    reflect: 'Where in your life do returns follow a predictable curve, and are you acting like you believe it?',
  }),

  /* ------------------------------- Inference ------------------------------- */
  c({
    id: 'sampling', title: 'Sampling & Temperature', cluster: 'inference', minutes: 4,
    summary: 'The model offers probabilities. A dice roll picks the word.',
    steps: [
      { h: 'The idea', p: 'A language model never outputs a word. It outputs a probability for every possible next token. Something else has to choose, and how it chooses changes the personality of the result.' },
      { h: 'How it works', p: 'Temperature reshapes the distribution before the draw. Low temperature sharpens it until the top choice nearly always wins: reliable, repetitive. High temperature flattens it, giving unlikely tokens a real chance: creative, then incoherent. Top-p cuts off the unlikely tail.' },
      { h: 'Why it matters', p: 'This is why the same prompt gives different answers each time, and why "regenerate" works. Randomness is not a flaw in the system; it is a dial.' },
    ],
    viz: { type: 'bars', variant: 'temperature', caption: 'Slide the temperature, then sample. Cold is predictable; hot is wild.' },
    quiz: { q: 'What does lowering the temperature towards zero do?', options: ['Makes output more random', 'Makes the most likely token almost always win', 'Shortens the answer', 'Changes the model\'s weights'], answer: 1, why: 'Low temperature exaggerates differences between probabilities, so sampling becomes near-deterministic.' },
    reflect: 'Where would your thinking benefit from a higher temperature? Where from a lower one?',
  }),
  c({
    id: 'prompting', title: 'In-Context Learning', cluster: 'inference', minutes: 4,
    summary: 'Show a few examples in the prompt and the model picks up the pattern, with no training.',
    steps: [
      { h: 'The idea', p: 'Give a model three examples of a task it has never been trained on and it will often do the fourth correctly. Nothing in its weights changed. It learned from the prompt alone.' },
      { h: 'How it works', p: 'During pretraining, predicting text well often required spotting a pattern earlier in the document and continuing it. The model learned to learn: attention finds the examples, infers the rule, applies it.' },
      { h: 'Why it matters', p: 'This is why prompting is a skill. Clear instructions, good examples and relevant context are not politeness; they are the programme you are running on a general-purpose machine.' },
    ],
    viz: { type: 'bars', variant: 'fewshot', caption: 'Add examples to the prompt and watch the right answer pull ahead.' },
    quiz: { q: 'When a model learns a task from examples in the prompt, what changes?', options: ['Its weights', 'Nothing permanent: only the context', 'Its tokenizer', 'Its architecture'], answer: 1, why: 'In-context learning happens entirely within the forward pass. Start a new conversation and it is gone.' },
    reflect: 'What is the best "worked example" you could give yourself before starting tomorrow\'s hardest task?',
  }),
  c({
    id: 'rag', title: 'Retrieval-Augmented Generation', cluster: 'inference', minutes: 4,
    summary: 'Look it up first, then answer with the source open on the desk.',
    steps: [
      { h: 'The idea', p: 'A model\'s knowledge is frozen at training time and it cannot see your private documents. Retrieval fixes both: find the relevant passages first, then hand them to the model alongside the question.' },
      { h: 'How it works', p: 'Documents are split into chunks and each chunk is embedded as a vector. The question is embedded too, and the nearest chunks are fetched and pasted into the context window. The model then answers from what is in front of it.' },
      { h: 'Why it matters', p: 'It turns a closed-book exam into an open-book one: current, checkable, and citeable. Quality depends mostly on retrieval. Fetch the wrong passages and the model will answer fluently from the wrong material.' },
    ],
    viz: { type: 'stepper', variant: 'rag', caption: 'Follow a question through the retrieval pipeline.' },
    quiz: { q: 'In RAG, how are relevant passages usually found?', options: ['Keyword match only', 'By comparing embedding vectors for similarity', 'The model remembers them', 'Random selection'], answer: 1, why: 'Question and chunks are embedded in the same space; nearest neighbours are retrieved.' },
    reflect: 'Your notes are your retrieval system. Could you find the right passage in ten seconds?',
  }),
  c({
    id: 'agents', title: 'Agents & Tools', cluster: 'inference', minutes: 4,
    summary: 'Put the model in a loop with tools and it stops answering and starts doing.',
    steps: [
      { h: 'The idea', p: 'On its own a model only produces text. Let that text be a request to run a tool (search, code, a file edit), feed the result back, and repeat. Now it can act, check and correct.' },
      { h: 'How it works', p: 'The loop: read the goal, decide on an action, emit a structured tool call, receive the result into the context, decide again. It ends when the model judges the goal met. The "agent" is the loop, not a different kind of model.' },
      { h: 'Why it matters', p: 'Errors compound over many steps, so reliability matters far more than in a single answer. Good agents are mostly good verification: run the test, read the output, do not assume.' },
    ],
    viz: { type: 'stepper', variant: 'agent', caption: 'One turn of an agent loop: think, act, observe.' },
    quiz: { q: 'What makes a model an "agent"?', options: ['A larger context window', 'Running in a loop where it can call tools and see results', 'Special training data', 'Higher temperature'], answer: 1, why: 'Agency comes from the surrounding loop: act, observe, decide again.' },
    reflect: 'In your own work loop, which step do you skip most often: thinking, acting, or checking?',
  }),
  c({
    id: 'hallucination', title: 'Hallucination', cluster: 'inference', minutes: 4,
    summary: 'Fluent, confident and wrong: what prediction looks like without knowledge.',
    steps: [
      { h: 'The idea', p: 'A model is trained to produce plausible continuations. When it does not know a fact, the most plausible continuation is still a fluent, confident sentence. It has the shape of an answer without the substance.' },
      { h: 'How it works', p: 'Well-attested facts form sharp peaks in the probability distribution. Rare or absent facts leave a flat spread of plausible-looking options, and sampling picks one. Nothing in the mechanism flags the difference unless the model was trained to notice its own uncertainty.' },
      { h: 'Why it matters', p: 'It is the main reason to verify anything important, and why retrieval, citations and tool use exist. Treat fluency and correctness as two separate signals.' },
    ],
    viz: { type: 'bars', variant: 'hallucination', caption: 'Reduce how often the fact appeared in training. The peak dissolves but the model still must pick.' },
    quiz: { q: 'Why do language models hallucinate?', options: ['They are designed to deceive', 'They generate plausible text even when they lack the fact', 'Their temperature is always too high', 'They run out of tokens'], answer: 1, why: 'The objective rewards plausibility. Without the fact, plausible-but-false is the natural output.' },
    reflect: 'When did you last sound more certain than you were? What gave it away, if anything?',
  }),

  /* ------------------------------- Generative ------------------------------ */
  c({
    id: 'diffusion', title: 'Diffusion Models', cluster: 'generative', minutes: 5,
    summary: 'Learn to remove noise, then start from pure noise and keep removing.',
    steps: [
      { h: 'The idea', p: 'Take an image and add a little random noise. Then a little more, until only static is left. Train a network to undo one small step of that damage. Run it in reverse from pure static and an image appears.' },
      { h: 'How it works', p: 'The network\'s only job: given a noisy image and how noisy it is, predict the noise. Subtract a fraction of the prediction, repeat for a few dozen steps. A text prompt steers each step towards images that match the description.' },
      { h: 'Why it matters', p: 'Breaking generation into many easy denoising steps turned out to be far more stable than making an image in one shot. The same recipe now produces audio, video, 3D shapes and protein structures.' },
    ],
    viz: { type: 'diffusion', caption: 'Drag from pure noise to a finished image, one denoising step at a time.' },
    quiz: { q: 'What is a diffusion model trained to predict?', options: ['The next pixel', 'The noise that was added to an image', 'A caption', 'The image\'s file size'], answer: 1, why: 'Predicting the noise lets you subtract it. Do that repeatedly and you walk from static to image.' },
    reflect: 'What would you make if you worked by removing what does not belong rather than adding what does?',
  }),
  c({
    id: 'multimodal', title: 'Multimodal Models', cluster: 'generative', minutes: 4,
    summary: 'Images, sound and text mapped into one shared space of meaning.',
    steps: [
      { h: 'The idea', p: 'If a photo of a dog and the words "a dog" land at nearby points in the same embedding space, a model can move freely between seeing and reading.' },
      { h: 'How it works', p: 'Images are cut into patches and each patch becomes a token, just like a word piece. Training on huge sets of image-caption pairs pulls matching pairs together and pushes mismatches apart. After that the transformer treats all tokens alike.' },
      { h: 'Why it matters', p: 'It is why you can paste a screenshot and ask a question about it. And it suggests the architecture is not about language as such: it is a general engine for sequences of anything.' },
    ],
    viz: { type: 'embed3d', variant: 'multimodal', caption: 'Circles are text, squares are images. Matching pairs sit together in the shared space.' },
    quiz: { q: 'How does a transformer take an image as input?', options: ['It converts the image to a caption first', 'It splits the image into patches treated as tokens', 'It cannot', 'It reads the file name'], answer: 1, why: 'Patches are embedded into vectors and processed exactly like text tokens.' },
    reflect: 'Which idea do you understand in words but not yet in pictures, or the other way round?',
  }),

  /* -------------------------------- Frontier ------------------------------- */
  c({
    id: 'interpretability', title: 'Interpretability', cluster: 'frontier', minutes: 5,
    summary: 'Opening the black box to read what the weights are actually computing.',
    steps: [
      { h: 'The idea', p: 'We can inspect every number in a model and still not know why it said what it said. Interpretability is the attempt to reverse-engineer the learned algorithm, the way a biologist studies a cell.' },
      { h: 'How it works', p: 'Single neurons usually respond to a jumble of unrelated things. Researchers train a second, sparse network to untangle activations into "features" that each mean one thing, then trace how features feed one another: circuits.' },
      { h: 'Why it matters', p: 'If you can find the feature for a concept, you can check whether it is active when it should not be, or turn it up and watch behaviour change. It is the difference between testing a system and understanding it.' },
    ],
    viz: { type: 'network', variant: 'inspect', caption: 'Click a hidden unit to see the feature it has learned to detect.' },
    quiz: { q: 'Why is studying single neurons often not enough?', options: ['There are too few of them', 'One neuron typically mixes many unrelated concepts', 'Neurons do not activate', 'They are encrypted'], answer: 1, why: 'Models pack more concepts than they have neurons (superposition), so meanings overlap inside single units.' },
    reflect: 'Which of your own strong opinions could you not explain the mechanism behind?',
  }),
  c({
    id: 'emergence', title: 'Emergent Abilities', cluster: 'frontier', minutes: 4,
    summary: 'Skills nobody trained for that appear, sometimes suddenly, with scale.',
    steps: [
      { h: 'The idea', p: 'Models are trained only to predict text. Yet at sufficient scale they translate, write code, do arithmetic and reason through multi-step problems. None of these was a training objective.' },
      { h: 'How it works', p: 'Some abilities improve gradually. Others sit near zero across many model sizes and then climb steeply. Often the underlying skill was building all along, and the test only registers it once every step of a long chain works.' },
      { h: 'Why it matters', p: 'It makes forecasting hard in both directions. The next ability may be close, and you cannot tell what a larger model will be able to do just by looking at a smaller one.' },
    ],
    viz: { type: 'scaling', variant: 'emergence', caption: 'Scale up and watch an ability stay flat, then switch on.' },
    quiz: { q: 'What is meant by an "emergent" ability?', options: ['One explicitly programmed in', 'One that appears from scale without being a direct training target', 'One copied from another model', 'A bug'], answer: 1, why: 'The objective was prediction. The ability arose because it helps prediction, once the model was capable enough.' },
    reflect: 'What can you do now that nobody ever taught you directly?',
  }),
];

/** Undirected edges between seeded concepts. */
export const EDGES: [string, string][] = [
  ['neuron', 'network'], ['neuron', 'activation'], ['network', 'activation'], ['network', 'loss'],
  ['loss', 'gradient-descent'], ['gradient-descent', 'backprop'], ['network', 'backprop'],
  ['loss', 'overfitting'], ['gradient-descent', 'overfitting'],
  ['tokens', 'embeddings'], ['embeddings', 'positional'], ['embeddings', 'latent'], ['network', 'embeddings'],
  ['embeddings', 'attention'], ['positional', 'attention'], ['attention', 'multihead'], ['multihead', 'block'],
  ['attention', 'block'], ['activation', 'block'], ['block', 'context'], ['tokens', 'context'], ['backprop', 'block'],
  ['block', 'pretraining'], ['loss', 'pretraining'], ['tokens', 'pretraining'], ['pretraining', 'finetuning'],
  ['finetuning', 'rlhf'], ['pretraining', 'scaling'], ['overfitting', 'finetuning'], ['gradient-descent', 'pretraining'],
  ['pretraining', 'sampling'], ['sampling', 'hallucination'], ['context', 'prompting'], ['attention', 'prompting'],
  ['prompting', 'rag'], ['embeddings', 'rag'], ['context', 'rag'], ['rag', 'hallucination'], ['prompting', 'agents'],
  ['rag', 'agents'], ['rlhf', 'hallucination'],
  ['latent', 'diffusion'], ['diffusion', 'multimodal'], ['embeddings', 'multimodal'], ['block', 'multimodal'],
  ['latent', 'interpretability'], ['multihead', 'interpretability'], ['scaling', 'emergence'],
  ['pretraining', 'emergence'], ['interpretability', 'emergence'], ['prompting', 'emergence'],
];
