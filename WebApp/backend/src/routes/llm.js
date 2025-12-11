const { getLLMClient } = require('../llm/client');
const {ChatPromptTemplate} = require("@langchain/core/prompts");
const router = require('express').Router();
const prompts = require('../../data/llms_prompts.json');

const PROMPT = `I give you the title description and id about a dataset, I have to categorize it as Cultural Heritage or Not.  \
            For datasets that are Cultural Heritage, you also need to further specify whether it is Tangible, Intangible, Natural Heritage and finally those that define thesaurus and data models, classify them as Generic.  \
            You will be provided with a dataset description, title and the id, and you will output a json object. Here is an example of how you should respond: \
            {{ \
                "category": "Cultural Heritage", \
                "sub_category": "Tangible" \
            }} \
            If the dataset is not part of the Cultural Heritage category, leave the value of the keys empty. If the dataset is of type Cultural Heritage, but you cannot define the sub category, do not enter the value in the key “sub_category”.`

const keyMapping = {
  f1M: 'F1-M Unique and persistent ID',
  f1D: 'F1-D URIs dereferenceability',
  f2aM: 'F2a-M - Metadata availability via standard primary sources',
  f2bM: 'F2b-M Metadata availability for all the attributes covered in the FAIR score computation',
  f3M: 'F3-M Data referrable via a DOI',
  f4M: 'F4-M Metadata registered in a searchable engine',
  f_score: 'F score',
  a1D: 'A1-D Working access point(s)',
  a1M: 'A1-M Metadata availability via working primary sources',
  a1_2: 'A1.2 Authentication & HTTPS support',
  a2M: 'A2-M Registered in search engines',
  a_score: 'A score',
  r1_1: 'R1.1 Machine- or human-readable license retrievable via any primary source',
  r1_2: 'R1.2 Publisher information, such as authors, contributors, publishers, and sources',
  r1_3D: 'R1.3-D Data organized in a standardized way',
  r1_3M: 'R1.3-M Metadata are described with VoID/DCAT predicates',
  r_score: 'R score',
  i1D: 'I1-D Standard & open representation format',
  i1M: 'I1-M Metadata are described with VoID/DCAT predicates',
  i2: 'I2 Use of FAIR vocabularies',
  i3D: 'I3-D Degree of connection',
  i_score: 'I score',
  fair_score: 'FAIR score',
  analysis_date: 'analysis_date'
};

router.post('/llm_topic', async (req, res) => {
  try {
    const userInput = req.body;

    if (!userInput) return res.status(400).json({ error: "Missing input" });
    
    const dataset_id = userInput.identifier;
    const dataset_title = userInput.title;
    const dataset_description = userInput.description.en;
    
    try {
      const llm = getLLMClient();

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful assistant."],
        ["human", PROMPT],
        ["human", `Dataset ID: {id}, Title: {title}, Description: {description}`]
      ]);

      const chain = prompt.pipe(llm);

      const response = await chain.invoke({
        id: dataset_id,
        title: dataset_title,
        description: dataset_description
      });
      
      console.log("LLM response:", response);

      if (!response || !response.content) {
        // LLM failed but allow submission
        return res.json({
          'llm_response': {
            category: '',
            sub_category: '',
            message: 'Unable to categorize with LLM at this time.'
          },
          'model_used': process.env.LLM_MODEL || 'N/A',
          'llm_failed': true
        });
      }

      // Try to parse the LLM response
      try {
        const cleaned_response = response.content
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/, '')
          .trim();
        const parsedResponse = JSON.parse(cleaned_response);
        
        if (!parsedResponse) {
          // Parsing failed but allow submission
          return res.json({
            'llm_response': {
              category: '',
              sub_category: '',
              message: 'Unable to categorize with LLM at this time.'
            },
            'model_used': process.env.LLM_MODEL || 'N/A',
            'llm_failed': true
          });
        }
        
        // Success - return parsed response
        res.json({
          'llm_response': parsedResponse,
          'model_used': process.env.LLM_MODEL,
          'llm_failed': false
        });
        
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        // Parsing failed but allow submission
        return res.json({
          'llm_response': {
            category: '',
            sub_category: '',
            message: 'Unable to categorize with LLM at this time.'
          },
          'model_used': process.env.LLM_MODEL || 'N/A',
          'llm_failed': true
        });
      }
      
    } catch (llmError) {
      console.error("LLM error:", llmError);
      // LLM error but allow submission
      return res.json({
        'llm_response': {
          category: '',
          sub_category: '',
          message: 'Unable to categorize with LLM at this time.'
        },
        'model_used': process.env.LLM_MODEL || 'N/A',
        'llm_failed': true
      });
    }
    
  } catch (err) {
    console.error("Request processing error:", err);
    res.json({
      'llm_response': {
        category: '',
        sub_category: '',
        message: 'Unable to categorize with LLM at this time.'
      },
      'model_used': 'N/A',
      'llm_failed': true
    });
  }
});

router.post('/llm_explain_fair', async (req, res) => {
  try {
    const fair_data = req.body;
    if (!fair_data) return res.status(400).json({ error: "Missing input" });

    const llm = getLLMClient();
    const fair_explanation = prompts.explain_FAIR;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant."],
      ["human", fair_explanation],
      ["human", "FAIR values obtained: {fair_data}"]
    ])
    const chain = prompt.pipe(llm);

    const response = await chain.invoke({
        fair_data: fair_data.fair_data
    });

    if (!response || !response.content) {
      return res.status(500).json({ error: "LLM response is empty or malformed" });
    } else {
      res.json({
        'llm_response': response.content,
        'model_used': process.env.LLM_MODEL
      });
    }
  } catch (err) {
    console.error("LLM error:", err);
    res.status(500).json({ error: "LLM processing failed" });
  }
});

router.post('/llm_explain_fairness_score_ot', async (req, res) => {
  try {
    const fair_data = req.body;
    if (!fair_data) return res.status(400).json({ error: "Missing input" });

    const keysToKeep = ['FAIR score', 'F score', 'A score', 'I score', 'R score'];

    fair_data.fair_data.forEach(entry => {
      const remappedFAIRness = {};
      for (const key in entry.FAIRness) {
        const newKey = keyMapping[key] || key;
        if (keysToKeep.includes(newKey)) {
          remappedFAIRness[newKey] = entry.FAIRness[key];
        }
      }
      entry.FAIRness = remappedFAIRness;
    });

    fair_data.fair_data.forEach(entry => {
      const remappedFAIRness = {};
      for (const key in entry.FAIRness) {
        const newKey = keyMapping[key] || key;
        remappedFAIRness[newKey] = entry.FAIRness[key];
      }
      entry.FAIRness = remappedFAIRness;
    });

    const llm = getLLMClient();
    const fair_explanation = prompts.explain_FAIRness_score_ot;


    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant."],
      ["human", fair_explanation],
      ["human", "FAIR score over time values obtained: {fair_data}"]
    ])
    const chain = prompt.pipe(llm);

    const response = await chain.invoke({
        fair_data: fair_data.fair_data
    });

    if (!response || !response.content) {
      return res.status(500).json({ error: "LLM response is empty or malformed" });
    } else {
      res.json({
        'llm_response': response.content,
        'model_used': process.env.LLM_MODEL
      });
    }
  } catch (err) {
    console.error("LLM error:", err);
    res.status(500).json({ error: "LLM processing failed" });
  }
});

module.exports = router;