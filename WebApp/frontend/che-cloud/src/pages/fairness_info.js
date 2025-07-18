import React, { use, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { base_url, kghb_url } from '../api';
import axios from 'axios';
import RadarChart from '../components/radar_chart'; 
import RadialBarChart from '../components/radial_bar';
import GaugeChart from '../components/gauge_chart';
import { Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Footer from '../components/footer';
import { formatFairnessDataForBrushChart } from '../utils';
import BrushChart from '../components/line_chart';


function FairnessInfo(){
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const dataset_id = queryParams.get('dataset_id');
    const [fairness_data, setFairnessData] = useState({});
    const [dataset_metadata, setDatasetMetadata] = useState(false);
    const [showDownloads, setShowDownloads] = useState(false);
    const [fairness_ot, setFairnessOt] = useState(false);
    const [brushSeriesFairness, setBrushSeriesFairness] = useState([]);
    const [minDate, setMinDate] = useState(null);
    const [maxDate, setMaxDate] = useState(null);

    useEffect(() => {
        async function getFairnessData(){
            try {
                //Same trasformation done by KGHeartBeat
                
                let sanitizedId = dataset_id.replace(/[\\/*?:"<>|]/g, "");
                sanitizedId = dataset_id.replace(/[\\/*?:"<>|]/g, "");
                sanitizedId = sanitizedId.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "");
                sanitizedId = sanitizedId.replace(/\s+/g, "");
                const response = await axios.get(`${base_url}/CHe_cloud_data/fairness_data/${sanitizedId}`);
                const responseOT = await axios.get(`${kghb_url}/fairness/fairness_over_time/${sanitizedId}`);
                setFairnessData(response.data)
                setFairnessOt(responseOT.data);
            } catch (error) {
            console.error("Error:",error)
            }
        } 
        getFairnessData();
        async function getJsonData(){
            try {
                const response = await axios.get(`${base_url}/CHe_cloud_data/dataset_metadata/${dataset_id}`);
                setDatasetMetadata(response.data)
            } catch (error) {
            console.error("Error:",error)
            }
        } 
        getJsonData();
    }, [])

    useEffect(() => {
        if (fairness_ot && Object.keys(fairness_ot).length > 0) {
            const { seriesData, minDate, maxDate } = formatFairnessDataForBrushChart(fairness_ot);
            setBrushSeriesFairness(seriesData);
            setMinDate(minDate);
            setMaxDate(maxDate);
        }
    }, [fairness_ot]);
    
    const chartReady = fairness_data && Object.keys(fairness_data).length > 0;
    const chart_categories = [
        "F score",
        "A score",
        "I score",
        "R score",
    ]
    const chartValues = chart_categories.map(category =>
        parseFloat(fairness_data[category] || 0)
    );
    const f_chart_categories = [
        "F1-M Unique and persistent ID",
        "F1-D URIs dereferenceability",
        "F2a-M - Metadata availability via standard primary sources",
        "F2b-M Metadata availability for all the attributes covered in the FAIR score computation",
        "F3-M Data referrable via a DOI",
        "F4-M Metadata registered in a searchable engine",
        "A1-D Working access point(s)",
        "A1-M Metadata availability via working primary sources",
        "A1.2 Authentication & HTTPS support",
        "A2-M Registered in search engines",
        "I1-D Standard & open representation format",
        "I1-M Metadata are described with VoID/DCAT predicates",
        "I2 Use of FAIR vocabularies",
        "I3-D Degree of connection",
        "R1.1 Machine- or human-readable license retrievable via any primary source",
        "R1.2 Publisher information, such as authors, contributors, publishers, and sources",
        "R1.3-D Data organized in a standardized way",
        "R1.3-M Metadata are described with VoID/DCAT predicates"
    ]
    const f_values = f_chart_categories.map(category =>
        parseFloat(fairness_data[category] || 0)
    );
    return (
        <>
            <div className="position-relative mt-2 mx-3">
            <div>
                <Link to="/search" className="btn btn-outline-success me-2">Search</Link>
                <Link to="/" className="btn btn-outline-success">Return to the Cloud</Link>
            </div>
            <Link
                to={`/add-dataset?dataset_id=${dataset_id}`}
                className="btn btn-warning btn-sm shadow"
                style={{
                position: 'absolute',
                top: 0,
                right: 0,
                fontWeight: '500',
                letterSpacing: '0.3px',
                }}
                title="Click to request a change to this dataset's metadata"
            >
                ✏️ Request Metadata Modification
            </Link>
            </div>
            <div className="container mt-3">
                <div className="text-center mb-4">
                {fairness_data.Ontology == 'True' ? (
                    <>
                    <h1 className="d-inline mb-4">{dataset_metadata.title}</h1>
                    <span className="badge bg-warning text-dark d-inline ms-2">Ontology</span>
                    </>
                ) : (
                    <>
                    <h1 className="d-inline mb-4">{dataset_metadata.title}</h1>
                    <span className="badge bg-secondary d-inline ms-2">Dataset</span>
                    </>
                )}
                </div>

                {dataset_metadata.description ? (
                    <p className="text-justify mb-5">{dataset_metadata.description.en}</p>
                ) : (
                    <p className="text-center mb-5">Loading Description data</p>
                )}

            {dataset_metadata && (
                <div className="card shadow-sm p-4 mb-5">
                    <h5 className="mb-3">Dataset Information</h5>
                    <Row>
                        {dataset_metadata.website && (
                            <Col md={6} className="mb-3">
                                <strong>Website: </strong>
                                <a href={dataset_metadata.website} target="_blank" rel="noopener noreferrer">
                                    {dataset_metadata.website}
                                </a>
                            </Col>
                        )}
                        {dataset_metadata.license ? (
                            <Col md={6} className="mb-3">
                                <strong>License: </strong>{dataset_metadata.license}
                            </Col>
                        ) : (
                            <Col md={6} className="mb-3">
                                <strong>License: </strong>Not specified
                            </Col>
                        )}
                        {dataset_metadata.contact_point.email || dataset_metadata.contact_point.name ? (
                            <Col md={6} className="mb-3">
                                <strong>Contact point</strong> <br />
                                <strong>email: </strong>{dataset_metadata.contact_point.email} <br />
                                <strong>name: </strong>{dataset_metadata.contact_point.name}
                            </Col>
                        ) : (
                            <Col md={6} className="mb-3">
                                <strong>Contact point not specified</strong>
                            </Col>
                        )}
                        {dataset_metadata.sparql[0] ? (
                            <Col md={6} className="mb-3">
                                <strong>SPARQL Endpoint: </strong>
                                <a href={dataset_metadata.sparql[0].access_url} target="_blank" rel="noopener noreferrer">
                                    {dataset_metadata.sparql[0].access_url}
                                </a>
                            </Col>
                        ) : (
                            <Col md={6} className="mb-3">
                                <strong>SPARQL Endpoint: </strong>Not specified
                            </Col>
                        )}
                        {(dataset_metadata?.other_download?.length > 0 || dataset_metadata?.full_download?.length > 0) && (
                             <Col md={6} className="mb-3">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowDownloads(!showDownloads)}
                                >
                                    {showDownloads ? 'Hide Downloadable Resources' : 'Show Downloadable Resources'}
                                </button>
                            </Col>
                        )}
                        {showDownloads && (
                            <div className="card shadow-sm p-4 mb-5">
                                <h5 className="mb-3">Downloadable Resources</h5>
                                {[...(dataset_metadata.full_download || []), ...(dataset_metadata.other_download || [])].map((item, index) => (
                                    <div key={index} className="mb-3">
                                        <p className="mb-1">
                                            <strong>{item.title || "Untitled resource"}</strong>
                                        </p>
                                        <a href={item.access_url || item.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                            {item.access_url || item.download_url}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Row>
                </div>
            )}
                <div className="mb-3">
                    <small className="text-muted">
                        FAIR metrics last updated on: <b>{new Date(fairness_data.analysis_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</b>. Assessment provided by <a href='http://www.isislab.it:12280/kgheartbeat/kgheartbeat' target='_blank' rel="noopener noreferrer">KGHeartBeat</a>.
                    </small>
                </div>
                {chartReady ? (
                    <Row className="g-4">
                    <Col md={4} sm={12}>
                        <div className="card shadow-sm p-3">
                        <h5 className="card-title text-center"></h5>
                        <GaugeChart label={'FAIR Score'} value={parseFloat(fairness_data['FAIR score'])} />
                        </div>
                    </Col>
                    
                    <Col md={4} sm={12}>
                        <div className="card shadow-sm p-3">
                        <h5 className="card-title text-center"></h5>
                        <RadialBarChart label={chart_categories} value={chartValues} />
                        </div>
                    </Col>

                    <Col md={4} sm={12}>
                        <div className="card shadow-sm p-3">
                        <h5 className="card-title text-center"></h5>
                        <RadarChart
                            title={''}
                            categories={f_chart_categories}
                            seriesData={[{ name: fairness_data['KG name'], data: f_values }]}
                            height={340}
                        />
                        </div>
                    </Col>
                    </Row>
                ) : (
                    <p className="text-center">Loading fairness data...</p>
                )}
                <Row className="g-4 mt-4">
                    { fairness_ot ? (
                        <Col md={12}>
                            <div className="card shadow-sm p-3">
                                <BrushChart
                                    data={brushSeriesFairness}
                                    xAxisLabel="Time"
                                    yAxisLabel="Fairness Score"
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    height={340}
                                    kg_name={dataset_metadata.title}
                                />
                            </div>
                        </Col>
                    ) : (
                        <Col md={12}>
                            <div className="card shadow-sm p-3">
                                <h5 className="card-title text-center">Loading FAIRness data over time</h5>
                            </div>
                        </Col>
                    )}
                </Row>
            </div>
            <Footer />
        </>
      );
}

export default FairnessInfo;