pipeline {
    agent any

    environment {
        IMAGE_NAME       = "fintrack-app"
        IMAGE_VERSION    = "1.0" 
        DOCKER_REGISTRY  = "nkcharan"
        CONTAINER_PORT   = "3000"
        HOST_PORT        = "3000"
        CONTAINER_NAME   = "fintrack"

        // RDS & DB credentials from Jenkins
        
        RDS_HOST         = credentials('rds-endpoint')   
        DB_NAME          = "fintrack_db"
        DB_USER          = credentials('rds-db-user')     
        DB_PASS          = credentials('rds-db-pass')
        APP_DB_USER      = credentials('rds-db-user')     
        APP_DB_PASS      = credentials('rds-db-pass')       
        DATABASE_SQL     = "database.sql"

        // DockerHub credentials from Jenkins
        DOCKER_USER      = credentials('dockerhub-username')
        DOCKER_PASS      = credentials('dockerhub-password')
        SONAR_TOKEN      = credentials('sonarqube-token')
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/charannk007/FinTrack.git'
            }
        }

stage('Provision DB on RDS') {
    when {
        allOf {
            branch 'main'
            not { expression { fileExists('.provisioned') } }
        }
    }
    steps {
        sh """
        echo 'Creating database and user on RDS...'
        mysql -h $RDS_HOST -u $DB_USER -p$DB_PASS <<EOF
        CREATE DATABASE IF NOT EXISTS $DB_NAME;
        CREATE USER IF NOT EXISTS '$APP_DB_USER'@'%' IDENTIFIED BY '$APP_DB_PASS';
        GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$APP_DB_USER'@'%';
        FLUSH PRIVILEGES;
        EOF

        touch .provisioned
        """
    }
}

stage('Deploy SQL to RDS') {
    when { branch 'main' }
    steps {
        sh """
        echo 'Importing schema/data into RDS...'
        mysql -h $RDS_HOST -u $APP_DB_USER -p$APP_DB_PASS $DB_NAME < $DATABASE_SQL
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

       stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('SonarQube') {  // Matches name in Manage Jenkins → System
            sh """
                ${tool 'SonarQubeScanner'}/bin/sonar-scanner \
                -Dsonar.projectKey=FinTrack \
                -Dsonar.sources=. \
                -Dsonar.host.url=http://65.0.61.136:9000 \
                -Dsonar.login=$SONAR_TOKEN
            """
        }
    }
}


        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_VERSION} ."
            }
        }

        stage('Push to DockerHub') {
            steps {
                sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_VERSION}"
                sh "docker tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_VERSION} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
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
