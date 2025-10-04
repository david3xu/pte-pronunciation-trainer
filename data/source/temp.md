# Most Frequently Used AI/ML Terms in Practice (2025)
*Curated list based on what practitioners actually use daily*

## Foundation Terms (Everyone Uses These)

**Artificial Intelligence**: Field enabling computers to perform tasks requiring human intelligence like learning, perception, and decision-making.

**Machine Learning**: Subset of AI where computers learn patterns from data without explicit programming.

**Deep Learning**: Advanced ML using multi-layered neural networks to analyze complex data, inspired by human brain structure.

**Large Language Models**: AI models trained on vast text datasets to understand and generate human-like language (e.g., GPT, Claude, Gemini).

**Neural Networks**: Computing systems with interconnected nodes processing information, foundation of modern AI.

**Model**: Trained algorithm that makes predictions or generates outputs; the result of training on data.

**Training**: Process of teaching model by exposing it to data so it learns patterns.

**Inference**: When trained model makes predictions on new data it hasn't seen before.

**Parameters**: Adjustable values in model that get tuned during training to improve performance (e.g., "7B parameters").

**Fine-Tuning**: Further training pre-trained model on specific dataset to specialize for particular task.

## Essential Production Terms

**Prompt Engineering**: Designing effective instructions to optimize AI model outputs.

**Prompt**: Input text or instruction given to AI model to generate response.

**Context Window**: Maximum amount of text model can process in single interaction.

**Token**: Smallest unit of text model processes; models have token limits.

**Hallucination**: When AI generates false or fabricated information confidently.

**Retrieval-Augmented Generation**: Combining information retrieval with generation to ground responses in real documents (RAG).

**Embedding**: Numerical representation of text capturing semantic meaning for similarity searches.

**Vector Database**: Database storing embeddings for efficient semantic search.

**API**: Application Programming Interface allowing programs to communicate with AI services.

**Endpoint**: URL or interface where applications send requests to get AI predictions.

## Agent & Automation Terms

**AI Agent**: Autonomous system that can reason, plan, use tools, and take actions to achieve goals.

**Agentic AI**: AI systems operating autonomously with minimal supervision to accomplish complex workflows.

**LangChain**: Popular framework for building LLM applications with tools for chaining prompts and managing workflows.

**Tool Calling**: Agent's ability to invoke external functions or APIs to accomplish tasks.

**Multi-Agent System**: Multiple specialized AI agents collaborating to handle complex tasks.

**Chain-of-Thought**: Technique where model shows step-by-step reasoning before final answer.

**Agent Orchestration**: Managing coordination between multiple agents working together.

## Model Training & Data

**Dataset**: Collection of data used to train or test models.

**Training Data**: Data used to teach model patterns and behaviors.

**Validation Data**: Separate data evaluating model during training to tune settings.

**Test Data**: Hold-out data assessing final model performance after training.

**Supervised Learning**: Training on labeled data where correct answers are provided.

**Unsupervised Learning**: Finding patterns in unlabeled data without predefined outputs.

**Reinforcement Learning**: Learning through trial and error with rewards for good decisions.

**Overfitting**: When model memorizes training data too well and performs poorly on new data.

**Data Drift**: Changes in data distribution over time affecting model performance.

**Hyperparameter**: Configuration setting chosen before training (unlike parameters learned during training).

## Explainability & Trust

**Explainable AI**: Methods making AI decisions transparent and understandable to humans (XAI).

**Black Box**: Model providing outputs without revealing decision-making process.

**Bias**: Systematic errors or unfair outcomes in AI systems due to training data or design.

**Fairness**: Ensuring AI treats different groups equitably without discrimination.

**SHAP**: Method assigning importance scores to features explaining predictions.

**LIME**: Technique explaining individual predictions by approximating with simpler local models.

**Feature Importance**: Measure showing which inputs most influence model predictions.

**AI Ethics**: Moral principles guiding responsible AI development and deployment.

**Responsible AI**: Practices ensuring AI is safe, fair, transparent, and accountable.

## MLOps & Production

**MLOps**: Practices streamlining ML model development, deployment, and maintenance in production.

**Model Deployment**: Making trained model available for use in production environments.

**Model Monitoring**: Tracking model performance and behavior in production.

**Pipeline**: Automated workflow connecting multiple steps (data processing, training, deployment).

**Continuous Training**: Automatically retraining models with new data to maintain accuracy.

**A/B Testing**: Comparing two model versions by exposing each to different user groups.

**Model Registry**: Centralized storage for managing and versioning trained models.

**Feature Store**: Repository for storing and serving features used by ML models.

**Model Versioning**: Tracking different iterations of models for reproducibility and rollback.

**Batch Inference**: Processing multiple prediction requests together rather than individually.

**Real-Time Inference**: Providing immediate predictions as requests arrive.

## Popular Platforms & Tools

**Azure Machine Learning**: Microsoft's cloud platform for full ML lifecycle.

**Amazon SageMaker**: AWS service for building, training, deploying ML models.

**Google Vertex AI**: Google's unified AI platform.

**MLflow**: Open-source platform for managing ML lifecycle including experiments and deployment.

**Databricks**: Unified analytics platform for data processing and ML.

**Weights & Biases**: Platform for experiment tracking and model collaboration.

**GitHub Copilot**: AI coding assistant generating code from natural language.

**Docker**: Tool for packaging applications in portable containers.

**Kubernetes**: Platform automating deployment and scaling of containerized applications.

## Natural Language Processing

**Natural Language Processing**: Enabling computers to understand and generate human language (NLP).

**Tokenization**: Breaking text into smaller units (tokens) for processing.

**Sentiment Analysis**: Determining emotional tone in text.

**Named Entity Recognition**: Identifying people, places, organizations in text.

**Text Classification**: Categorizing text into predefined groups.

**Machine Translation**: Automatically translating between languages.

**Text Generation**: Creating human-like text from prompts or data.

## Computer Vision

**Computer Vision**: Enabling computers to interpret visual information.

**Image Classification**: Categorizing images into classes.

**Object Detection**: Identifying and locating objects in images.

**Bounding Box**: Rectangle drawn around objects to indicate location.

**Facial Recognition**: Identifying individuals from facial features.

**Image Generation**: Creating new images using AI (e.g., DALL-E, Stable Diffusion).

## Model Types & Architectures

**Transformer**: Neural network architecture using attention mechanisms, foundation of modern LLMs.

**Attention Mechanism**: Component allowing models to focus on relevant input parts.

**Encoder-Decoder**: Architecture with separate components for processing inputs and generating outputs.

**Convolutional Neural Network**: Network using convolution operations, effective for images (CNN).

**Recurrent Neural Network**: Network processing sequential data by maintaining memory (RNN).

**Generative AI**: AI creating new content including text, images, code, audio.

**Diffusion Model**: Model generating images by gradually removing noise (e.g., Stable Diffusion).

**Multimodal Model**: AI processing multiple data types simultaneously (text, images, audio).

## Optimization & Efficiency

**Quantization**: Reducing numerical precision to decrease model size and increase speed.

**Model Compression**: Reducing model size while maintaining performance.

**Knowledge Distillation**: Training smaller model to mimic larger model's behavior.

**LoRA**: Low-Rank Adaptation - efficient method for fine-tuning models with minimal parameter updates.

**Pruning**: Removing unnecessary parameters from models to reduce size.

**Batch Size**: Number of examples processed together during training.

**Learning Rate**: How much model adjusts during each training step.

**GPU**: Graphics Processing Unit - hardware accelerating AI computations.

## Safety & Governance

**AI Safety**: Ensuring AI operates without causing unintended harm.

**Prompt Injection**: Attack manipulating model by inserting malicious instructions.

**Content Filtering**: Blocking harmful or inappropriate outputs.

**Human-in-the-Loop**: Requiring human validation at critical decision points.

**Red Teaming**: Adversarial testing to find system vulnerabilities.

**Guardrails**: Safety mechanisms preventing unintended agent behaviors.

**Audit Trail**: Recorded history of system actions for accountability.

**Model Card**: Documentation providing transparency about model capabilities and limitations.

## Performance & Metrics

**Accuracy**: Percentage of correct predictions.

**Precision**: Of predicted positives, how many were actually correct.

**Recall**: Of actual positives, how many were correctly identified.

**F1 Score**: Balance between precision and recall.

**Latency**: Time delay between request and response.

**Throughput**: Amount of work processed in given time.

**Loss Function**: Measure of model error during training that gets minimized.

**Confusion Matrix**: Table showing correct and incorrect predictions by category.

## Infrastructure & Deployment

**Cloud Computing**: Delivering computing services over internet.

**Edge Computing**: Processing data near source rather than centralized cloud.

**Containerization**: Packaging applications with dependencies in isolated containers.

**Serverless**: Running code without managing underlying servers.

**Load Balancing**: Distributing requests across multiple servers.

**API Gateway**: Entry point managing API requests and routing.

**Microservices**: Designing applications as independent, modular services.

**CI/CD**: Continuous Integration/Continuous Deployment - automated testing and release process.

## Collaboration & Development

**Jupyter Notebook**: Interactive environment for writing code with documentation.

**Version Control**: Tracking changes to code over time (e.g., Git).

**Experiment Tracking**: Recording ML experiments with parameters and results.

**Model Artifact**: File or object produced during ML process (weights, configs).

**Checkpoint**: Saved state during training allowing resumption if interrupted.

**Baseline**: Simple model or benchmark for comparison.

**Pre-Training**: Initial training on large dataset before specialization.

## Current Trends (2025 Specific)

**Reasoning Model**: LLM enhanced for logical thinking and multi-step problem solving (e.g., o1, o3).

**Agentic Workflow**: Process where agents autonomously plan, execute, and refine tasks.

**Physical AI**: AI systems interacting with and learning from physical world.

**Vibe Coding**: Writing code by describing problems in natural language, AI generates implementation.

**Small Language Model**: Compact models offering efficiency with lower resource requirements.

**Frugal AI**: Developing efficient AI prioritizing reduced computation and energy use.

**Digital Watermarking**: Embedding markers identifying AI-generated content.

**Emergent Behavior**: Unexpected capabilities arising from complex AI system interactions.

**Model Context Protocol**: Standard enabling agents to connect with external tools uniformly (MCP).

**Agent-to-Agent Protocol**: Communication standard for agents across platforms (A2A).

---

**Total: 150 Core Terms**

These are the terms you'll encounter most frequently in:
- Technical documentation and papers
- Production AI/ML projects
- Team discussions and meetings
- Industry conferences and talks
- Job descriptions and interviews

**Sources**: TechCrunch AI Glossary, Google ML Glossary, InfoQ Trends Report, Zendesk AI Terms, Industry surveys (2025)