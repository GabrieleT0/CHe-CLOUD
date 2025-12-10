const router = require('express').Router();
const { response } = require('express');
const { getAllIdsAndLinks, getAllJsonDataByID, getAllJsonData, getCollection } = require('../models/CHe_cloud_data');
const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();
const path = require('path');
const { parse } = require('json2csv');
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const fairness_page = 'fairness-info';
const khgeartbeatUrl = process.env.KGHEARTBEAT_API

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


router.get('/all_ch_links', async (req, res) => {
    try {
        const items = await getAllIdsAndLinks();
        const allowedKeywords = ["ch-tangible", "ch-intangible",'ch-natural','ch-generic'];
        if (!items.length) {
            return res.status(404).json({ message: "No elements founded." });
        }
        const nodes = items.map(item => {
            let matchedKeyword = item.keywords.find(kw => allowedKeywords.includes(kw));
            if (matchedKeyword == 'ch-tangible'){
                matchedKeyword = 'Tangible'
            }
            if (matchedKeyword == 'ch-intangible'){
                matchedKeyword = 'Intangible'
            }
            if (matchedKeyword == 'ch-generic'){
                matchedKeyword = 'Generic'
            }
            if (matchedKeyword == 'ch-natural'){
                matchedKeyword = 'Natural'
            }
            return {
                "id": item.identifier,
                "title" : item.title,
                "url": `${frontendUrl}${fairness_page}?dataset_id=${item.identifier}`,
                "category": matchedKeyword || 'Generic'
            }
        });
        const links = [];
        const nodeIds = new Set(nodes.map(node => node.id)); // Create a set of node IDs for faster lookup
        items.forEach(item => {
            item.links
                .filter(link => nodeIds.has(link.target)) // Only keep links with a valid target, we want to build a Cloud with only CH KGs
                .forEach(link => {
                    links.push({
                        "source": item.identifier,
                        "target": link.target,
                        //"value": link.value,
                    });
                });
        });
        const response = {
            "nodes" : nodes,
            "links" : links
        }
        res.json(response);
        
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/export_csv', async (req, res) => {
    try {
        const items = await getAllJsonData();
        if (!items.length) {
            return res.status(404).json({ message: "No elements found." });
        }

        // Define fields with custom labels
        const fields = [
            { label: 'Identifier', value: 'identifier' },
            { label: 'Title', value: 'title' },
            { label: 'Description', value: (row) => row.description?.en || '' },
            { label: 'Keywords', value: (row) => (row.keywords || []).join('; ') },
            { label: 'License', value: 'license' },
            { label: 'doi', value: 'doi' },
            { label: 'Contact point', value: (row) => `Name: ${row.contact_point?.name || ''} Email: ${row.contact_point?.email || ''}` },
            { label: 'Website', value: 'website' },
            { label: 'Triples', value: 'triples' },
            { label: 'owner', value: (row) => `Name: ${row.owner?.name || ''} Email: ${row.owner?.email || ''}` },
            { label: 'SPARQL Endpoint', value: (row) => row.sparql_endpoint?.[0].access_url || '' },
            { label: 'RDF dump', value: (row) => row.full_download && row.full_download.length > 0 ? row.full_download.map(item => item.download_url).join(' | ') : '' },
            { label: 'Other download', value: (row) => row.other_download && row.other_download.length > 0 ? row.other_download.map(item => item.access_url).join(' | ') : '' },
            { label: 'Namespace', value: 'namespace' },
            { label: 'Examples',  value: (row) => row.example && row.example.length > 0 ? row.example.map(item => item.access_url).join(' | ') : '' },
            // Map fairness fields
            ...Object.entries(keyMapping).map(([key, label]) => ({
                label: label,
                value: `fairness.${key}`
            }))
        ];

        const csv = parse(items, { fields });

        res.setHeader('Content-Disposition', 'attachment; filename="CHe-CLOUD_datasets.csv"');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.status(200).send(csv);

    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/fairness_data/:id', async (req, res) => {
    try{
        const targetId = req.params.id;
        const response = await fetch(`https://kgheartbeat.di.unisa.it/kgheartbeat-api/fairness/${targetId}`);
        const data = await response.json();
        const mappedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
            keyMapping[key] || key, // fallback to original key if no mapping
            value
            ])
        ); 

        if (mappedData) {
            return res.json(mappedData);
        } else {
            return res.status(404).json({ message: "Dataset not found" });
        }

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/dataset_metadata/:id', async (req, res) => {
    try{
        const dataset_id = req.params.id;
        const json_data = await getAllJsonDataByID(dataset_id);
        if (json_data){
            res.status(200).json(json_data);
        } else {
            res.status(404).json({ message: "Dataset not found" });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ åmessage: "Server error" });
    }
});

router.get('/get_all', async (req, res) => {
    try {
        const items = await getAllJsonData();
        if (!items.length) {
            return res.status(404).json({ message: "No elements founded." });
        }
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.get('/search', async (req, res) => {
  const searchTerm = req.query.q || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const allowedFields = ['title', 'description', 'identifier', 'keywords'];

  // Normalize selected fields
  let selectedFields = [];
  const rawFields = req.query.fields;

  if (typeof rawFields === 'string') {
    selectedFields = rawFields.split(',').map(f => f.trim());
  } else if (Array.isArray(rawFields)) {
    selectedFields = rawFields.flatMap(f => f.split(',').map(f => f.trim()));
  }

  // Only keep allowed fields
  selectedFields = selectedFields.filter(f => allowedFields.includes(f));

  // If no fields selected AND no query, search all
  if (selectedFields.length === 0 && searchTerm === '') {
    selectedFields = allowedFields;
  }

  // If fields not selected but there's a search term, fallback to ['title']
  if (selectedFields.length === 0) {
    selectedFields = ['title'];
  }

  try {
    const collection = await getCollection();
    let query = {};

    if (searchTerm && selectedFields.length > 0) {
      query.$or = selectedFields.map(field => {
        if (field === 'description') {
          return { 'description.en': { $regex: searchTerm, $options: 'i' } };
        } else if (field === 'keywords') {
          return { keywords: { $elemMatch: { $regex: searchTerm, $options: 'i' } } };
        } else {
          return { [field]: { $regex: searchTerm, $options: 'i' } };
        }
      });
    }

    const projection = { title: 1, identifier: 1, _id: 0 };

    const [results, total] = await Promise.all([
      collection.find(query, { projection }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ]);

    res.json({
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;