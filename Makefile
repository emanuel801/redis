PROJECT_ID=$(shell gcloud config get-value core/project)
APP=redis-conect


build:
	gcloud builds submit --tag gcr.io/$(PROJECT_ID)/$(APP)

