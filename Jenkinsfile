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
        ROOT_USER = "root"              // RDS root user
        ROOT_PASSWORD = "root123"       // store in Jenkins credentials ideally
        DATABASE_SQL = "database.sql"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git 'https://github.com/your-username/your-fintrack-repo.git'
            }
        }

        stage('Provision DB & User on RDS') {
            steps {
                sh """
                echo 'Creating database and granting privileges...'
                mysql -h $RDS_HOST -u $ROOT_USER -p$ROOT_PASSWORD <<EOF
                CREATE DATABASE IF NOT EXISTS $DB_NAME;
                CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
                GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
                FLUSH PRIVILEGES;
                EOF
                """
            }
        }

        stage('Deploy SQL to RDS') {
            steps {
                sh """
                echo 'Running schema/data SQL file on RDS...'
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
            echo '✅ FinTrack app built, deployed, and running in container!'
        }
        failure {
            echo '❌ Build or deploy failed. Check above logs.'
        }
    }
}
