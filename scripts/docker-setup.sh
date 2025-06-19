#!/bin/bash

# AIGentic Docker Development Environment Setup Script
# This script helps with Docker container management and health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if a service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1

    print_status "Checking health of $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name | grep -q "healthy\|Up"; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        print_status "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy within expected time"
    return 1
}

# Function to display service URLs
show_service_urls() {
    echo ""
    print_status "🚀 Development services are running:"
    echo ""
    echo "  📊 Prisma Studio:     http://localhost:5555"
    echo "  📧 Mailhog:          http://localhost:8025"
    echo "  🗄️  Redis Commander:  http://localhost:8081 (optional)"
    echo "  🐘 pgAdmin:          http://localhost:8080 (optional)"
    echo "  🔧 Next.js App:      http://localhost:3000"
    echo ""
    print_status "Database connections:"
    echo "  🔴 Redis:    redis://localhost:6379"
    echo "  🐘 Postgres: postgresql://postgres:password@localhost:5432/aigentic"
    echo ""
}

# Function to run health checks
health_check() {
    print_status "Running health checks for all services..."
    
    # Check Redis
    if docker exec aigentic-redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is responding"
    else
        print_error "Redis health check failed"
    fi
    
    # Check PostgreSQL
    if docker exec aigentic-postgres pg_isready -U postgres -d aigentic >/dev/null 2>&1; then
        print_success "PostgreSQL is responding"
    else
        print_error "PostgreSQL health check failed"
    fi
    
    # Check Mailhog
    if curl -s http://localhost:8025 >/dev/null 2>&1; then
        print_success "Mailhog is responding"
    else
        print_warning "Mailhog health check failed (non-critical)"
    fi
}

# Main script logic
case "${1:-start}" in
    "start")
        print_status "Starting AIGentic development environment..."
        check_docker
        
        print_status "Starting core services (Redis, PostgreSQL, Mailhog)..."
        docker-compose up -d redis postgres mailhog
        
        print_status "Waiting for services to be ready..."
        sleep 5
        
        check_service_health "redis"
        check_service_health "postgres"
        
        print_success "Core services are ready!"
        show_service_urls
        
        print_status "To start optional management tools, run:"
        echo "  docker-compose --profile tools up -d"
        ;;
        
    "stop")
        print_status "Stopping AIGentic development environment..."
        docker-compose down
        print_success "All services stopped"
        ;;
        
    "restart")
        print_status "Restarting AIGentic development environment..."
        docker-compose down
        sleep 2
        $0 start
        ;;
        
    "logs")
        service_name=${2:-}
        if [ -n "$service_name" ]; then
            print_status "Showing logs for $service_name..."
            docker-compose logs -f $service_name
        else
            print_status "Showing logs for all services..."
            docker-compose logs -f
        fi
        ;;
        
    "health")
        health_check
        ;;
        
    "tools")
        print_status "Starting optional development tools..."
        docker-compose --profile tools up -d
        print_success "Development tools started"
        show_service_urls
        ;;
        
    "clean")
        print_warning "This will remove all containers and volumes. Data will be lost!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Cleaning up Docker environment..."
            docker-compose down -v --remove-orphans
            docker volume prune -f
            print_success "Environment cleaned"
        else
            print_status "Cleanup cancelled"
        fi
        ;;
        
    "status")
        print_status "Docker service status:"
        docker-compose ps
        echo ""
        health_check
        ;;
        
    *)
        echo "AIGentic Docker Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start core development services (default)"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  logs      Show logs for all services (or specify service name)"
        echo "  health    Run health checks"
        echo "  tools     Start optional development tools"
        echo "  status    Show service status and health"
        echo "  clean     Remove all containers and volumes (WARNING: data loss)"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs redis"
        echo "  $0 health"
        ;;
esac 