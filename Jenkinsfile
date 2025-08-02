pipeline {
    agent any

    environment {
        IMAGE_NAME = "fintrack-app"
        DOCKER_REGISTRY = "your-dockerhub-username"
        CONTAINER_PORT = "3000"
        HOST_PORT = "3000"
        CONTAINER_NAME = "fintrack_container"

        // RDS credentials (admin/admin123456)
        RDS_HOST = credentials('rds-endpoint')           // RDS endpoint
        DB_NAME = "fintrack_db"
        DB_USER = credentials('rds-db-user')             // admin
        DB_PASS = credentials('rds-db-pass')             // admin123456
        DATABASE_SQL = "database.sql"

        // SonarQube
        SONAR_TOKEN = credentials('sonarqube-token')     // Sonar token
    }

    stages {
        stage('Clone Repository') {
            steps {
                git 'https://github.com/your-username/your-fintrack-repo.git'
            }
        }

        stage('Provision Database (only once)') {
            when {
                not {
                    expression { fileExists('.provisioned') }
                }
            }
            steps {
                sh """
                echo 'Creating database (if not exists)...'
                mysql -h $RDS_HOST -u $DB_USER -p$DB_PASS <<EOF
                CREATE DATABASE IF NOT EXISTS $DB_NAME;
                EOF
                touch .provisioned
                """
            }
        }

        stage('Deploy SQL Schema/Data') {
            steps {
                sh """
                echo 'Importing schema/data into RDS...'
                mysql -h $RDS_HOST -u $DB_USER -p$DB_PASS $DB_NAME < $DATABASE_SQL
                """
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('SonarQube Analysis') {
            environment {
                SONAR_SCANNER_HOME = tool 'SonarQubeScanner'
            }
            steps {
                withSonarQubeEnv('SonarQubeServer') {
                    sh """
                    ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                    -Dsonar.login=$SONAR_TOKEN
                    """
                }
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
            echo '✅ FinTrack pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Please check logs.'
        }
    }
}
