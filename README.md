<div align="center">
  <a href="https://github.com/github_username/repo_name">
    <img src="WebApp/frontend/che-cloud/public/favicon.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">CHeCLOUD</h3>

  <p align="center">
    CHe-Cloud is an open-source project aimed at creating the Cloud for visualizing Cultural Heritage Linked Open Data. For each resource indexed within the cloud it is possible to view its FAIRness and the main information contained in the resource metadata such as: description, license, SPARQL endpoint and Data Dump.
    The project comprises two main components: the first (CHe_cloud_generator) is responsible for generating the Cloud by processing resources from the Linked Open Data (LOD) Cloud, supplemented with manually curated entries; the second component, the WebApp, provides a web-based interface for visualizing the resulting Cloud.
    <br />
    <a href="https://checloud.di.unisa.it"><strong>Explore the CHeCLOUD »</strong></a>
    <br />
    <br />
    <a href="https://gabrielet0.github.io/CHe-CLOUD/">See the additional material for the Article</a>
    <!-- &middot;
    <a href="https://github.com/github_username/repo_name/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/github_username/repo_name/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a> !-->
  </p>
</div>

## Repository structure
The [CHe_cloud_generator/src](./CHe_cloud_generator/src/) folder contains:
- The Python code used to generate the CHeCLOUD based on the annotations provided by the two researchers, as well as the code for the experiment using the keywords extracted from the SLR and that for the LLMs.
- The [evaluate_fairness.py](./CHe_cloud_generator/src/evaluate_fairness.py) script, which enables the computation of dataset fairness based on the results from KGHeartBeat.

The [CHe_cloud_generator/data](./CHe_cloud_generator/data/) folder contains:
- The [keyword_from_SLR](./CHe_cloud_generator/data/keywords_from_SLR/) folder, which includes the keywords extracted from the papers identified using an SLR approach. These keywords were used to automatically categorize the datasets in the LOD cloud.
- The [WebApp](./WebApp/) folder, which contains the code required to serve the CHeCLOUD.

### Built With
* ![image](https://img.shields.io/badge/Python-FFD43B?style=for-the-badge&logo=python&logoColor=blue)
* ![image](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
* ![image](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
