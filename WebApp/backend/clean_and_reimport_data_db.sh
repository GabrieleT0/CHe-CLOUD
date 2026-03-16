docker stop checloud-mongodb
docker rm checloud-mongodb
rm -rf mongo_data
mkdir mongo_data
docker compose up -d
docker cp ./CHe_cloud_data.json checloud-mongodb:/CHe_cloud_data.json
docker exec checloud-mongodb mongoimport \
  --db mydatabase \
  --collection CHe_cloud_data \
  --file /CHe_cloud_data.json \
  --jsonArray --upsert