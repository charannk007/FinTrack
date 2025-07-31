pipeline {
    agent any

    environment {
        IMAGE_NAME = "fintrack-app"
        DOCKER_REGISTRY = "your-dockerhub-username"
        CONTAINER_PORT = "3000"
        HOST_PORT = "3000"
        CONTAINER_NAME = "fintrack_container"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git 'https://github.com/your-username/your-fintrack-repo.git'
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
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Run Docker Container') {
            steps {
                // Stop and remove old container if running
                sh "docker stop ${CONTAINER_NAME} || true"
                sh "docker rm ${CONTAINER_NAME} || true"

                // Run new container
                sh """
                docker run -d --name ${CONTAINER_NAME} \
                -p ${HOST_PORT}:${CONTAINER_PORT} \
                -e DB_HOST=your_mysql_host \
                -e DB_USER=root \
                -e DB_PASSWORD=root123 \
                -e DB_NAME=hospital_db \
                ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                """
            }
        }
    }

    post {
        success {
            echo 'FinTrack app built, pushed, and running in a container successfully!'
        }
        failure {
            echo 'Something went wrong. Check the logs above.'
        }
    }
}
