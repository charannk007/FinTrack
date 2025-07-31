pipeline {
    agent any

    environment {
        IMAGE_NAME = "fintrack-app"
        DOCKER_REGISTRY = "your-dockerhub-username"
        CONTAINER_PORT = "3000"
        HOST_PORT = "3000"
        CONTAINER_NAME = "fintrack_container"

        // RDS-related environment variables
        RDS_HOST = "your-rds-endpoint.rds.amazonaws.com"
        DB_NAME = "fintrack_db"
        DB_USER = "admin"
        DB_PASS = "admin123456"
        DATABASE_SQL = "database.sql"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git 'https://github.com/your-username/your-fintrack-repo.git'
            }
        }

        stage('Deploy SQL to RDS') {
            steps {
                sh """
                echo 'Deploying SQL to RDS...'
                mysql -h $RDS_HOST -u $DB_USER -p$DB_PASS $DB_NAME < $DATABASE_SQL
                """
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            when {
                expression { fileExists('test') }
            }
            steps {
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest ."
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([
                    usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
                ]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Run Docker Container') {
            steps {
                sh "docker stop ${CONTAINER_NAME} || true"
                sh "docker rm ${CONTAINER_NAME} || true"

                sh """
                docker run -d --name ${CONTAINER_NAME} \
                -p ${HOST_PORT}:${CONTAINER_PORT} \
                -e DB_HOST=$RDS_HOST \
                -e DB_USER=$DB_USER \
                -e DB_PASSWORD=$DB_PASS \
                -e DB_NAME=$DB_NAME \
                ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                """
            }
        }
    }

    post {
        success {
            echo '✅ FinTrack deployed and running successfully!'
        }
        failure {
            echo '❌ Deployment failed. Check Jenkins logs.'
        }
    }
}
