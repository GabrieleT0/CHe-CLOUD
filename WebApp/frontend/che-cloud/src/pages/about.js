import { Link } from 'react-router-dom';
import Navbar from '../components/navbar';


function About() {
  return (
    <div className="container-fluid mt-3 px-4">
      <Navbar />
      <h1>About CHeCLOUD</h1> 
      <p>
       CHeCLOUD is an open-source project aimed at creating the Cultural Heritage Linked Open Data (sub)cloud. For each resource indexed within the cloud it is possible to view its FAIRness and the main information contained in the resource metadata such as: description, license, SPARQL endpoint and Data Dump. 
      </p>
        <p>
         The project is developed by Antonio Lieto, Maria Angela Pellegrino and Gabriele Tuozzo from the University of Salerno.
         For further information on the bootstrap process of the subcloud and the assessment of the FAIRness of the datasets it contains, please refer to the paper currently under review at the Semantic Web Journal at the following link: <a href="https://www.semantic-web-journal.net/system/files/swj3879.pdf">https://www.semantic-web-journal.net/system/files/swj3879.pdf</a>
      </p>
      <h2>Licensing</h2>
      <p>
        The CHeCLOUD source code is licensed under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a>. 
        All new datasets submitted to CHeCLOUD are licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)</a>.
      </p>
      <h2>Contact Us</h2>
      <p>
        For any inquiries or support, please contact us at <a href="mailto:gtuozzo@unisa.it">gtuozzo@unisa.it</a>
      </p>
    </div>
  );
}

export default About;